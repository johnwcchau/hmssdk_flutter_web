const path = require('path');

module.exports = {
  mode: 'production',
  //mode: 'development',
  entry: './hmssdk.js',
  output: {
    path: path.resolve(__dirname, '../assets'),
    filename: 'hmssdk_flutter_web.js',
  },
};