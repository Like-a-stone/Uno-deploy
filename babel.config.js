const config = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: { node: 'current' },
                modules: 'auto'
            }
        ]
    ],
    plugins: [
        '@babel/plugin-transform-modules-commonjs'
    ]
};

export default config;