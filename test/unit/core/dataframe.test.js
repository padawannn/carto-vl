import Dataframe from '../../../src/core/dataframe';

// import dataframe from '../../../src/core/dataframe';

describe('src/core/dataframe', () => {
    describe('.getFeaturesAtPosition', () => {
        describe('when dataframe is point type', () => {
            it('should return an empty list when there are no points at the given position', () => { });
            it('should return a list containing the features at the given position', () => { });
        });

        describe('when dataframe is line type', () => {
            it('should return an empty list when there are no lines at the given position', () => { });
            it('should return a list containing the features at the given position', () => { });
        });

        describe('when dataframe is polygon type', () => {
            const polygon1 = {
                flat: [
                    0, 0,
                    0, 1,
                    1, 0
                ],
                holes: [],
            };
            const dataframe = new Dataframe({
                center: { x: 0, y: 0 },
                scale: 1,
                geom: [[polygon1]],
                properties: {
                    numeric_property: [0],
                    cartodb_id: [0],
                },
                type: 'polygon',
                size: 1,
                active: true,
                metadata: {
                    columns: [
                        {
                            name: 'cartodb_id',
                            type: 'float'
                        },
                        {
                            name: 'numeric_property',
                            type: 'float'
                        }]
                }
            });
            const feature1 = {
                id: 0,
                properties: {
                    numeric_property: 0,
                    cartodb_id: 0
                }
            };
            it('should return an empty list when there are no features at the given position', () => {
                expect(dataframe.getFeaturesAtPosition({ x: -0.01, y: 0.0 })).toEqual([]);
                expect(dataframe.getFeaturesAtPosition({ x: 0.51, y: 0.51 })).toEqual([]);
                expect(dataframe.getFeaturesAtPosition({ x: 0.0, y: 1.01 })).toEqual([]);
                expect(dataframe.getFeaturesAtPosition({ x: 1.01, y: 0.0 })).toEqual([]);
            });
            it('should return a list containing the features at the given position', () => {
                expect(dataframe.getFeaturesAtPosition({ x: 0.0, y: 0.0 })).toEqual([feature1]);
                expect(dataframe.getFeaturesAtPosition({ x: 0.5, y: 0.5 })).toEqual([feature1]);
                expect(dataframe.getFeaturesAtPosition({ x: 0.0, y: 1.0 })).toEqual([feature1]);
                expect(dataframe.getFeaturesAtPosition({ x: 1.0, y: 0.0 })).toEqual([feature1]);
            });
        });

    });
});
