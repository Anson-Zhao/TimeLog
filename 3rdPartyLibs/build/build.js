({
    // appDir: '/src',
    baseUrl: './',
    paths: {
        // jquery: '../3rdPartyLibs/jquery-3.3.1.min.js',
        // almond: './almond',
        // WorldWind: '../../src/WorldWind'
    },
    optimize: 'none',
    name: './almond',
    include: ['../../src/WorldWind'],
    out: "./WorldWind-built.js",
    wrap: {
        startFile: './start.frag',
        endFile: './end.frag'
    }
})

