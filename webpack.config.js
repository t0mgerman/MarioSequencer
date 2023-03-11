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
                test: /\.css$/i,
                use: [ 'style-loader', 'css-loader' ]
            },
            {
                test: /\.scss$/i,
                use: [
                    'style-loader', 'css-loader', 'sass-loader'
                ],
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.js', '.scss' ]
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