const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

console.log(path.resolve(__dirname, 'src', 'main'));

module.exports = {
    entry: {
        main: path.resolve(__dirname, 'src', 'app.ts'),
    },
    devtool: 'source-map',
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.js' ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'index.html'),
            title: 'Mario Sequencer',
        })
    ],
    target: 'web',
    mode: 'production',
    stats: {
        errorDetails: true
    }
}