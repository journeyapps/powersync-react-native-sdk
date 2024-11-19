import { registerRootComponent } from 'expo';
import App from './App';
import {Buffer} from '@craftzdog/react-native-buffer';

global.Buffer = Buffer;
// global.process.cwd = () => 'sxsx';
// global.process.env = {NODE_ENV: 'production'};
// global.location = {};

registerRootComponent(App);
