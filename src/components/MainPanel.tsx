import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { PanelProps, Vector as VectorData } from '@grafana/data';
import { MapOptions } from '../types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom, DragRotateAndZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import Control from 'ol/control/Control';
import nanoid from 'nanoid';
import { processData } from './utils/helpers';
import 'ol/ol.css';
import '../style/MainPanel.css';

interface Props extends PanelProps<MapOptions> {}
interface Buffer extends VectorData {
  buffer: any;
}

interface IState {
  colors: { [key: string]: string };
}

export class MainPanel extends PureComponent<Props, IState> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  pointLayer: VectorLayer;
  lineLayer: VectorLayer;

  state: IState = {
    colors: {},
  };
  componentDidMount() {
    const { tile_url, zoom_level, showLastPoint, showLastLine, center_lon, center_lat } = this.props.options;
    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });
    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function (event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
        new DragRotateAndZoom(),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    const jsx = (
      <select defaultValue={showLastPoint ? 'locLayer' : 'lineLayer'} onChange={this.handleSwitch}>
        <option value="locLayer">Latest Point</option>
        <option value="lineLayer">Latest Line</option>
      </select>
    );
    const div = document.createElement('div');
    div.className = 'ol-control ol-custom-control';
    ReactDOM.render(jsx, div);
    const ctl = new Control({ element: div });
    this.map.addControl(ctl);

    if (this.props.data.series.length == 0) return;

    const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
    const { pointLayer, lineLayer, newcolors } = processData(buffer, {});
    this.setState({ colors: newcolors });

    this.pointLayer = pointLayer;
    this.lineLayer = lineLayer;

    if (showLastPoint) this.map.addLayer(this.pointLayer);

    if (showLastLine) this.map.addLayer(this.lineLayer);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      const { showLastPoint, showLastLine } = this.props.options;
      const { colors } = this.state;

      this.map.removeLayer(this.pointLayer);
      this.map.removeLayer(this.lineLayer);

      if (this.props.data.series.length == 0) return;
      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      const { pointLayer, lineLayer, newcolors } = processData(buffer, colors);
      this.setState({ colors: newcolors });

      this.pointLayer = pointLayer;
      this.lineLayer = lineLayer;
      if (showLastPoint) this.map.addLayer(this.pointLayer);

      if (showLastLine) this.map.addLayer(this.lineLayer);
    }

    if (prevProps.options.showLastPoint !== this.props.options.showLastPoint && this.props.options.showLastPoint) {
      this.map.removeLayer(this.lineLayer);
      this.map.addLayer(this.pointLayer);
    }

    if (prevProps.options.showLastLine !== this.props.options.showLastLine && this.props.options.showLastLine) {
      this.map.removeLayer(this.pointLayer);
      this.map.addLayer(this.lineLayer);
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
  }

  handleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { options, onOptionsChange } = this.props;
    if (e.target.value === 'locLayer') {
      onOptionsChange({
        ...options,
        showLastPoint: true,
        showLastLine: false,
      });
    }
    if (e.target.value === 'lineLayer') {
      onOptionsChange({
        ...options,
        showLastPoint: false,
        showLastLine: true,
      });
    }
  };

  render() {
    return <div id={this.id} style={{ width: '100%', height: '100%' }}></div>;
  }
}
