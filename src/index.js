/**
 *  @api
 *  @namespace carto
 *
 *  @description
 *  The CARTO VL functionality is exposed through the **carto** namespace including:
 *
 * - {@link carto.source.Dataset|carto.source.Dataset}
 * - {@link carto.source.SQL|carto.source.SQL}
 * - {@link carto.source.GeoJSON|carto.source.GeoJSON}
 * - {@link carto.source.MVT|carto.source.MVT}
 * - {@link carto.source.MVT.Metadata|carto.source.MVT.Metadata}
 * - {@link carto.expressions|carto.expressions}
 * - {@link carto.Layer|carto.Layer}
 * - {@link carto.Viz|carto.Viz}
 * - {@link carto.Interactivity|carto.Interactivity}
 * - {@link carto.setDefaultAuth|carto.setDefaultAuth}
 * - {@link carto.setDefaultConfig|carto.setDefaultConfig}
 */

import { setDefaultAuth } from './setup/auth-service';
import { setDefaultConfig } from './setup/config-service';
import Viz from './Viz';
import Map from './integrator/Map';
import Interactivity from './interactivity/Interactivity';
import Layer from './Layer';
import * as expressions from './renderer/viz/expressions';
import Dataset from './sources/Dataset';
import GeoJSON from './sources/Geojson';
import MVT from './sources/Mvt';
import SQL from './sources/Sql';

// Namespaces

const source = { Dataset, SQL, GeoJSON, MVT };

export { setDefaultAuth, setDefaultConfig, source, expressions, Layer, Viz, Map, Interactivity };

