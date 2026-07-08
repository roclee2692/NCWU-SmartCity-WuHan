const mockjs = require("mockjs");
const fs = require("fs");
const path = require("path");

const emptyCollection = { type: "FeatureCollection", features: [] };

function readGeoJson(fileName) {
  const filePath = path.join(__dirname, "GIS_DATA", fileName);
  if (!fs.existsSync(filePath)) {
    return emptyCollection;
  }

  return require(filePath);
}

const Wuhan_roads = readGeoJson("Wuhan_roads.json");
const Wuhan_events = readGeoJson("Wuhan_events.json");
const Wuhan_Buildings = readGeoJson("Wuhan_Buildings.json");
const Wuhan_bridge = readGeoJson("Wuhan_bridge.json");
const fly_path = readGeoJson("fly_path.json");
const fly_end = readGeoJson("fly_end.json");

module.exports = () => {
  return mockjs.mock({
    Wuhan_roads,
    Wuhan_events,
    Wuhan_Buildings,
    Wuhan_bridge,
    fly_path,
    fly_end,
  });
};
