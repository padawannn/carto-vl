import * as s from '../../../../../src/renderer/viz/expressions';
import { validateDynamicTypeErrors, validateStaticType, validateStaticTypeErrors } from './utils';

describe('src/renderer/viz/expressions/between', () => {
    describe('error control', () => {
        validateDynamicTypeErrors('between', ['category', 'number', 'number']);
        validateDynamicTypeErrors('between', ['number', 'category', 'number']);
        validateDynamicTypeErrors('between', ['number', 'number', 'category']);
        validateStaticTypeErrors('between', ['number', 'number', 'color']);
        validateStaticTypeErrors('between', ['color', 'number', 'color']);
    });

    describe('type', () => {
        validateStaticType('between', ['number', 'number', 'number'], 'number');
    });

    describe('eval', () => {
        testEval(9, 0);
        testEval(10, 1);
        testEval(15, 1);
        testEval(20, 1);
        testEval(21, 0);
    });

    function testEval(price, expected) {
        it(`between($price, 10, 20) should return 0 when $price is ${price}`, () => {
            const fakeFeature = { price };
            const $price = s.property('price');
            const actual = s.between($price, 10, 20).eval(fakeFeature);

            expect(actual).toEqual(expected);
        });
    }
});


