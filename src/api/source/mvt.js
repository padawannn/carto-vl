import Base from './base';
import * as rsys from '../../client/rsys';
import Dataframe from '../../core/dataframe';
import * as Protobuf from 'pbf';
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile';
import { decodeLines, decodePolygons } from '../../client/mvt/feature-decoder';
import { validateTemplateURL } from '../url';
import * as util from '../util';
import CartoValidationError from '../error-handling/carto-validation-error';
import DataframeCache from './DataframeCache';

const geometryTypes = {
    UNKNOWN: 'unknown',
    POINT: 'point',
    LINE: 'line',
    POLYGON: 'polygon'
};

export default class MVT extends Base {

    /**
     * Create a carto.source.MVT.
     *
     * @param {object} data - A MVT data object
     * @param {object} metadata - A carto.source.mvt.Metadata object
     *
     * @example
     * const metadata = new carto.source.mvt.Metadata([{ type: 'number', name: 'total_pop'}])
     * new carto.source.MVT("https://{server}/{z}/{x}/{y}.mvt", metadata);
     *
     * @fires CartoError
     *
     * @constructor MVT
     * @extends carto.source.Base
     * @memberof carto.source
     * @api
     */
    constructor(templateURL, metadata) {
        super();
        this._validateInputParams(templateURL, metadata);
        this._templateURL = templateURL;
        this._requestGroupID = 0;
        this._oldDataframes = [];
        this.metadata = metadata;
        this._cache = new DataframeCache();
    }

    _validateInputParams(url, metadata) {
        validateTemplateURL(url);
        if (util.isUndefined(metadata)) {
            throw new CartoValidationError('source', 'metadataRequired');
        }
    }

    _clone() {
        return new MVT(this._templateURL, this.metadata);
    }

    bindLayer(addDataframe, dataLoadedCallback) {
        this._addDataframe = addDataframe;
        this._dataLoadedCallback = dataLoadedCallback;
    }

    async requestMetadata(viz) {
        this._MNS = viz.getMinimumNeededSchema();
        return this.metadata;
    }

    requestData(viewport) {
        const tiles = rsys.rTiles(viewport);
        this._getTiles(tiles);
    }

    free() {
        this._cache = new DataframeCache();
        this._oldDataframes = [];
    }

    _getTiles(tiles) {
        this._requestGroupID++;
        var completedTiles = [];
        var needToComplete = tiles.length;
        const requestGroupID = this._requestGroupID;
        tiles.forEach(t => {
            const { x, y, z } = t;
            this._getDataframe(x, y, z).then(dataframe => {
                if (dataframe.empty) {
                    needToComplete--;
                } else {
                    completedTiles.push(dataframe);
                }
                if (completedTiles.length == needToComplete && requestGroupID == this._requestGroupID) {
                    this._oldDataframes.map(d => d.active = false);
                    completedTiles.map(d => d.active = true);
                    this._oldDataframes = completedTiles;
                    this._dataLoadedCallback();
                }
            });
        });
    }

    _getDataframe(x, y, z) {
        return this._cache.get(`${x},${y},${z}`, () => this._requestDataframe(x, y, z));
    }

    _requestDataframe(x, y, z) {
        const mvt_extent = 4096;

        return fetch(this._getTileUrl(x, y, z))
            .then(rawData => rawData.arrayBuffer())
            .then(response => {

                if (response.byteLength == 0 || response == 'null') {
                    return { empty: true };
                }
                var tile = new VectorTile(new Protobuf(response));
                const mvtLayer = tile.layers[Object.keys(tile.layers)[0]];
                var fieldMap = {};
                const numFields = [];
                const jsonFields = [];
                const stringFields = [];
                this.metadata.columns.map(c => {
                    const type = c.type;
                    if (type == 'json') {
                        jsonFields.push(c.name);
                    } else if (type == 'number') {
                        numFields.push(c.name);
                    } else if (type == 'category') {
                        stringFields.push(c.name);
                    } else {
                        throw new Error(`Column type '${type}' not supported`);
                    }

                });
                numFields.map((name, i) => fieldMap[name] = i);
                jsonFields.map((name, i) => fieldMap[name] = i + numFields.length);
                stringFields.map((name, i) => fieldMap[name] = i + jsonFields.length);

                const { points, featureGeometries, properties, geomType } = this._decodeMVTLayer(mvtLayer, mvt_extent, this._MNS, jsonFields, numFields, stringFields, fieldMap);
                this.metadata.geomType = geomType;

                var rs = rsys.getRsysFromTile(x, y, z);
                let dataframeProperties = {};
                Object.keys(fieldMap).map((name, pid) => {
                    dataframeProperties[name] = properties[pid];
                });
                let dataFrameGeometry = geomType == geometryTypes.POINT ? points : featureGeometries;
                const dataframe = this._generateDataFrame(rs, dataFrameGeometry, dataframeProperties, mvtLayer.length, geomType);
                this._addDataframe(dataframe);
                return dataframe;
            });
    }

    _getTileUrl(x, y, z) {
        return this._templateURL.replace('{x}', x).replace('{y}', y).replace('{z}', z);
    }

    _getSubdomain(x, y) {
        // Reference https://github.com/Leaflet/Leaflet/blob/v1.3.1/src/layer/tile/TileLayer.js#L214-L217
        return this._subdomains[Math.abs(x + y) % this._subdomains.length];
    }

    _decodeMVTLayer(mvtLayer, mvt_extent, MNS, jsonFields, numFields, stringFields, fieldMap) {
        const properties = [];
        this.metadata.columns.map(c => {
            var e = null;
            if (c.type == 'number') {
                e = new Float32Array(mvtLayer.length + 1024);
            } else if (c.type == 'json') {
                e = {};
            } else if (c.type == 'category') {
                e = {};
            }
            properties[fieldMap[c.name]] = e;
        });
        var points = null;
        const geomType = VectorTileFeature.types[mvtLayer.feature(0).type].toLowerCase();
        let featureGeometries = [];
        for (var i = 0; i < mvtLayer.length; i++) {
            const f = mvtLayer.feature(i);
            const geom = f.loadGeometry();
            if (geomType == geometryTypes.POINT) {
                if (points == null) {
                    points = new Float32Array(mvtLayer.length * 2);
                }
                points[2 * i + 0] = 2 * (geom[0][0].x) / mvt_extent - 1.;
                points[2 * i + 1] = 2 * (1. - (geom[0][0].y) / mvt_extent) - 1.;
            } else if (geomType == geometryTypes.POLYGON) {
                const decodedPolygons = decodePolygons(geom, mvt_extent);
                featureGeometries.push(decodedPolygons);
            } else if (geomType == geometryTypes.LINE) {
                const decodedLines = decodeLines(geom, mvt_extent);
                featureGeometries.push(decodedLines);
            } else {
                throw new Error(`Unimplemented geometry type: '${geomType}'`);
            }

            // TODO check number of properties received and send error if not all the defined
            // properties are being received
            this.metadata.columns.map(c => {
                var e = null;
                if (c.type === 'number') {
                    e = Number(f.properties[c.name]);
                } else if (c.type == 'json') {
                    e = JSON.parse(f.properties[c.name]);
                } else if (c.type == 'category') {
                    e = f.properties[c.name];
                }
                properties[fieldMap[c.name]][i] = e;
            });
        }

        return { properties, points, featureGeometries, geomType };
    }

    _generateDataFrame(rs, geometry, properties, size, type) {
        const dataframe = new Dataframe({
            active: false,
            center: rs.center,
            geom: geometry,
            properties: properties,
            scale: rs.scale,
            size: size,
            type: type,
            metadata: this.metadata,
        });

        return dataframe;
    }
}
