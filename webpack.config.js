const WebpackPwaManifest = require('webpack-pwa-manifest');
const WorkboxPlugin = require('workbox-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = (env, argv) => {

    const dev = argv.mode === "development";
    const prod = argv.mode === "production";

    return {
        entry: {
            main: path.resolve(__dirname, 'src', 'app.ts'),
        },
        devServer: {
            hot: dev,
            client: dev ? {
                overlay: true
            } : false,
            devMiddleware: {
                writeToDisk: prod
            }
        },
        devtool: dev ?? 'source-map',
        output: {
            clean: true,
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: dev ? "" : "/MarioSequencer/"
        },
        module: {
            rules: [
                {
                    test: /\.wav$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'wav/[name][ext]'
                    }
                },
                {
                    test: /\.(png|gif)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'image/[name][ext]'
                    }
                },
                {
                    test: /\.css$/i,
                    use: [{ loader: MiniCssExtractPlugin.loader }, 'css-loader']
                },
                {
                    test: /\.scss$/i,
                    use: [
                        { loader: MiniCssExtractPlugin.loader }, 'css-loader', 'sass-loader'
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
            extensions: ['.ts', '.js', '.scss', '.wav', '.png'],
        },
        plugins: [
            new WebpackPwaManifest({
                name: 'Mario Sequencer',
                short_name: 'Mario Sequencer',
                description: 'Sequencer based on Mario Paint\'s music composer',
                background_color: '#1bb79f',
                icons: [
                    {
                        src: path.resolve('public/mario512.png'),
                        sizes: [96, 128, 192, 256, 384, 512]
                    },
                    {
                        src: path.resolve('public/mario512.png'),
                        size: '512x512'
                    },
                    {
                        src: path.resolve('public/mario512maskable.png'),
                        size: '512x512',
                        purpose: 'maskable'
                    }
                ],
                start_url: dev ? '/' : '/MarioSequencer/'
            }),
            new WorkboxPlugin.GenerateSW({
                clientsClaim: true,
                skipWaiting: true
            }),
            new HtmlWebpackPlugin({
                template: path.join(__dirname, 'index.html'),
                title: 'Mario Sequencer',
                favicon: path.resolve('public/favicon.ico'),
                base: dev ? '/' : '/MarioSequencer/'
            }),
            new MiniCssExtractPlugin({
                filename: '[name].css'
            })
        ],
        target: 'web',
        mode: argv.mode,
        stats: {
            errorDetails: true
        }
    }
}