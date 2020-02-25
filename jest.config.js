module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '@microfleet/((?:core|plugin-[a-z-]+).*?(?=/lib/)?)(?:/lib/)?(.*)?': '<rootDir>/packages/$1/src/$2',
  },
};
