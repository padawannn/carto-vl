import { validateStaticType, validateStaticTypeErrors } from '../utils';
import { namedColor } from '../../../../../../src/renderer/viz/expressions';

describe('src/renderer/viz/expressions/named-color', () => {
    describe('error control', () => {
        validateStaticTypeErrors('namedColor', [undefined]);
    });

    describe('type', () => {
        validateStaticType('namedColor', ['blue'], 'color');
        validateStaticType('namedColor', ['AliceBlue'], 'color');
        validateStaticType('namedColor', ['BLACK'], 'color');
    });

    describe('.value', () => {
        it('should work with blue', () => {
            expect(namedColor('blue').value).toEqual({ r: 0, g: 0, b: 255, a: 1 });
        });
        it('should work with red', () => {
            expect(namedColor('red').value).toEqual({ r: 255, g: 0, b: 0, a: 1 });
        });
    });

    describe('.eval', () => {
        it('should work with blue', () => {
            expect(namedColor('blue').eval()).toEqual({ r: 0, g: 0, b: 255, a: 1 });
        });
        it('should work with red', () => {
            expect(namedColor('red').eval()).toEqual({ r: 255, g: 0, b: 0, a: 1 });
        });
    });
});
