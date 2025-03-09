const config = {
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testEnvironment: 'node',
    moduleFileExtensions: ['js'],
    transformIgnorePatterns: [
        'node_modules/(?!(sequelize|pg|pg-hstore)/)',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    moduleDirectories: ['node_modules', 'src'],
    roots: ['<rootDir>/src'],
    collectCoverage: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/src/models/",
        "/src/config/",
    ],
    coverageThreshold: {
        global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
        }
    }
};

export default config;