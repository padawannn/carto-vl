const map = new mapboxgl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [] },
    center: [0, 0],
    zoom: 0
});

const source = new carto.source.GeoJSON(sources['polygon']);
const style = new carto.Style();
const layer = new carto.Layer('layer', source, style);

layer.addTo(map);