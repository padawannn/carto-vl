import BaseExpression from './base';
import { number, viewportHistogram } from '../functions';
import { checkNumber, checkInstance, checkType } from './utils';
import Property from './property';
import * as schema from '../../schema';

let quantilesUID = 0;

/**
 * Generate quantiles of size `n` from the features on the viewport.
 *
 * @param {carto.expressions.Base} input - The input expression used in the quantiles
 * @param {number} n - Number of buckets to be returned
 * @return {carto.expressions.Base}
 *
 * @example <caption>Use quantiles to define a color ramp.</caption>
 * const s = carto.expressions;
 * const viz = new carto.Viz({
 *   color: s.ramp(s.quantiles(s.prop('density'), 5), s.palettes.PRISM)
 * });
 *
 * @example <caption>Use quantiles to define a color ramp. (String)</caption>
 * const viz = new carto.Viz(`
 *   color: ramp(quantiles($density, 5), PRISM)
 * `);
 *
 * @memberof carto.expressions
 * @name quantiles
 * @function
 * @api
 */
export const Quantiles = genQuantiles(false);

/**
 * Generate quantiles of size `n` from all the features.
 *
 * @param {carto.expressions.Base} input - The input expression used in the quantiles
 * @param {number} n - Number of buckets to be returned
 * @return {carto.expressions.Base}
 *
 * @example <caption>Use global quantiles to define a color ramp.</caption>
 * const s = carto.expressions;
 * const viz = new carto.Viz({
 *   color: s.ramp(s.globalQuantiles(s.prop('density'), 5), s.palettes.PRISM)
 * });
 *
 * @example <caption>Use global quantiles to define a color ramp. (String)</caption>
 * const viz = new carto.Viz(`
 *   color: ramp(globalQuantiles($density, 5), PRISM)
 * `);
 *
 * @memberof carto.expressions
 * @name globalQuantiles
 * @function
 * @api
 */
export const GlobalQuantiles = genQuantiles(true);

function genQuantiles(global) {
    return class Quantiles extends BaseExpression {
        constructor(input, buckets) {
            checkInstance('quantiles', 'input', 0, Property, input && (input.property || input));
            checkNumber('quantiles', 'buckets', 1, buckets);

            let children = {
                input
            };
            if (!global) {
                children._histogram = viewportHistogram(input);
            }
            let breakpoints = [];
            for (let i = 0; i < buckets - 1; i++) {
                children[`arg${i}`] = number(i * 10);
                breakpoints.push(children[`arg${i}`]);
            }
            super(children);
            this.quantilesUID = quantilesUID++;
            this.numCategories = buckets;
            this.buckets = buckets;
            this.breakpoints = breakpoints;
            this.type = 'category';
        }
        eval(feature) {
            const input = this.input.eval(feature);
            const q = this.breakpoints.findIndex(br => input <= br);
            return q;
        }
        getBreakpointList() {
            this._genBreakpoints();
            return this.breakpoints.map(br => br.expr);
        }
        _compile(metadata) {
            super._compile(metadata);
            checkType('quantiles', 'input', 0, 'number', this.input);
            if (global) {
                const copy = metadata.sample.map(s => s[this.input.name]);
                copy.sort((x, y) => x - y);
                this.breakpoints.map((breakpoint, index) => {
                    const p = (index + 1) / this.buckets;
                    breakpoint.expr = copy[Math.floor(p * copy.length)];
                });
            }
        }
        _applyToShaderSource(getGLSLforProperty) {
            const childSources = this.childrenNames.map(name => this[name]._applyToShaderSource(getGLSLforProperty));
            let childInlines = {};
            childSources.map((source, index) => childInlines[this.childrenNames[index]] = source.inline);
            const funcName = `quantiles${this.quantilesUID}`;
            const elif = (_, index) =>
                `${index > 0 ? 'else' : ''} if (x<(${childInlines[`arg${index}`]})){
            return ${index.toFixed(2)};
        }`;
            const funcBody = this.breakpoints.map(elif).join('');
            const preface = `float ${funcName}(float x){
        ${funcBody}
        return ${this.breakpoints.length.toFixed(1)};
    }`;
            return {
                preface: this._prefaceCode(childSources.map(s => s.preface).reduce((a, b) => a + b, '') + preface),
                inline: `${funcName}(${childInlines.input})`
            };
        }
        _genBreakpoints() {
            if (!global) {
                const hist = this._histogram.eval();

                const histogramBuckets = hist.length;
                const min = hist[0].x[0];
                const max = hist[histogramBuckets - 1].x[1];

                let prev = 0;
                const accumHistogram = hist.map(({ y }) => {
                    prev += y;
                    return prev;
                });


                let i = 0;
                const total = accumHistogram[histogramBuckets - 1];
                let brs = [];
                // TODO OPT: this could be faster with binary search
                this.breakpoints.map((breakpoint, index) => {
                    for (i; i < histogramBuckets; i++) {
                        if (accumHistogram[i] > (index + 1) / this.buckets * total) {
                            break;
                        }
                    }
                    const percentileValue = i / histogramBuckets * (max - min) + min;
                    brs.push(percentileValue);
                    breakpoint.expr = percentileValue;
                });
            }
        }
        _preDraw(program, drawMetadata, gl) {
            this._genBreakpoints();
            super._preDraw(program, drawMetadata, gl);
        }
        _getColumnName() {
            if (this.input.aggName) {
                // Property has aggregation
                return schema.column.aggColumn(this.input.name, this.input.aggName);
            }
            return this.input.name;
        }
    };
}
