import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import { Circle, Stroke, Style, Fill, RegularShape } from 'ol/style';

interface SingleData {
  latitude: number;
  longitude: number;
  hash_id: string;
  [key: string]: any;
}

function randomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export const createPoint = (lonlat: Coordinate, color: string) => {
  const pointFeature = new Feature(new Point(lonlat).transform('EPSG:4326', 'EPSG:3857'));
  pointFeature.setStyle(
    new Style({
      image: new Circle({
        radius: 5,
        fill: new Fill({ color: color }),
      }),
    })
  );

  return pointFeature;
};

export const drawFeature = (routeData: Coordinate[], color: string) => {
  if (routeData.length == 1) {
    return createPoint(routeData[0], color);
  }

  const dx = routeData[0][0] - routeData[1][0];
  const dy = routeData[0][1] - routeData[1][1];
  const rotation = Math.atan2(dy, dx);

  const lineFeature = new Feature(new LineString([routeData[1], routeData[0]]).transform('EPSG:4326', 'EPSG:3857'));
  lineFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    }),
    new Style({
      geometry: new Point(routeData[0]).transform('EPSG:4326', 'EPSG:3857'),
      image: new RegularShape({
        fill: new Fill({ color: color }),
        points: 3,
        radius: 8,
        rotation: -rotation,
        angle: Math.PI / 2,
      }),
    }),
  ]);
  return lineFeature;
};

export const processData = (data: SingleData[]) => {
  const perDeviceRoute: { [key: string]: [number, number][] } = {};

  data.map((datum) => {
    if (perDeviceRoute[datum.hash_id] && perDeviceRoute[datum.hash_id].length == 1) {
      perDeviceRoute[datum.hash_id].push([datum.longitude, datum.latitude]);
    } else {
      perDeviceRoute[datum.hash_id] = [[datum.longitude, datum.latitude]];
    }
  });

  return perDeviceRoute;
};

export const produceLayer = (
  perDevice: { [key: string]: [number, number][] },
  hash_list: string[],
  colors: { [key: string]: string }
) => {
  const filter_absent_hash = hash_list.filter((hash_id) => perDevice[hash_id]);

  const dataPoints = filter_absent_hash.map((hash_id) => {
    if (!colors[hash_id]) colors[hash_id] = randomColor();

    return createPoint(perDevice[hash_id][0], colors[hash_id]);
  });

  const pointLayer = new VectorLayer({
    source: new VectorSource({
      features: dataPoints,
    }),
    zIndex: 2,
  });

  const dataLines = filter_absent_hash.map((hash_id) => {
    return drawFeature(perDevice[hash_id], colors[hash_id]);
  });

  const lineLayer = new VectorLayer({
    source: new VectorSource({
      features: dataLines,
    }),
    zIndex: 2,
  });

  return { pointLayer, lineLayer, newcolors: colors };
};
