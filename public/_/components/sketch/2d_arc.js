import { escape, unescape } from "../../helpers/global.js";

export class Arc {

    constructor(data) {

        this.data = data, this.id = data.id ? data.id : this.genID(6);

        this.mode = data.mode ? data.mode : 'annotate';

        this.annotation = data.annotation ? data.annotation : 'arc-angle';

        this.rect = data.rect ? data.rect : '';

        this.params = data.params ? data.params : [];

        this.style = {
            stroke_width: '3px',
            stroke: '#ff007d',
            fill: 'rgba(255, 255, 255, 0)'
        }

        this.selected = null;

        this.data.points = this.describeArc(data.params.x, data.params.y, data.params.radius, data.params.startAngle, data.params.endAngle);

        this.draw(this.data);
    }

    /**
     * Redraw this area with own or custom coordinates
     * 
     * @param coords {Object} [coords=undefined]
     * @returns {Area} - this area
     */
    draw = (data) => {

        if (this.mode == 'annotate') {

            let arc = `<g data-id="${this.id}" data-type="arc" data-params="${escape(JSON.stringify(data.params))}" data-annotation="${this.annotation}" ><path data-id="${this.id}" fill="transparent" d="${data.points}" style="stroke-width:${this.style.stroke_width};stroke:${this.style.stroke};fill:${this.style.fill};"></path></g>`;
            document.querySelector("#svg").insertAdjacentHTML('beforeend', arc);

            this.drawCircle('start', data);
            this.drawCircle('end', data);
        }

        if (this.mode == 'editing') {

            let params = [];
            if (document.querySelector('#svg g[data-id="' + this.id + '"]')) params = JSON.parse(unescape(document.querySelector('#svg g[data-id="' + this.id + '"]').dataset.params));

            let a = params.x - data.params.x;
            let b = params.y - data.params.y;

            let newDeg = (Math.atan2(a, b) * 180 / Math.PI); newDeg = newDeg < 0 ? newDeg * (-1) : 360 - newDeg;

            if (this.rect == 'start') params.startAngle = newDeg;
            if (this.rect == 'end') params.endAngle = newDeg;

            this.data.points = this.describeArc(params.x, params.y, params.radius, params.startAngle, params.endAngle);

            // update arc
            document.querySelector('#svg g[data-id="' + this.id + '"] path').setAttribute('d', this.data.points);
            document.querySelector('#svg g[data-id="' + this.id + '"]').dataset.params = escape(JSON.stringify(params));

            // update circles
            if (document.querySelector('#svg g[data-id="' + this.id + '"] rect[data-rect="' + this.rect + '"')) document.querySelector('#svg g[data-id="' + this.id + '"] rect[data-rect="' + this.rect + '"').setAttribute('x', params.x + (data.params.radius * Math.cos(this.degToRad(newDeg))) - 4);
            if (document.querySelector('#svg g[data-id="' + this.id + '"] rect[data-rect="' + this.rect + '"')) document.querySelector('#svg g[data-id="' + this.id + '"] rect[data-rect="' + this.rect + '"').setAttribute('y', params.y + (data.params.radius * Math.sin(this.degToRad(newDeg))) - 4);
        }

        return this;
    };

    /**
     * Moving circle rect object
     * 
     * @param coords {Object} - Object with coords of this area, with field 'points'
     */
    drawCircle = (type, data) => {

        var angleInRadians = 0;

        if (type == 'start') angleInRadians = this.degToRad(data.params.startAngle);
        if (type == 'end') angleInRadians = this.degToRad(data.params.endAngle);

        let x = (data.params.x + (data.params.radius * Math.cos(angleInRadians))) - 4;
        let y = (data.params.y + (data.params.radius * Math.sin(angleInRadians))) - 4;

        let rect = `<rect data-id="${type + this.id}" x="${x}" y="${y}" data-type="arc" class="po" data-rect="${type}" width="8" height="8" rx="8" style="stroke-width:2px;stroke:${this.style.stroke};fill:rgba(255,255,255,1);" />`;
        if (document.querySelector('#svg g[data-id="' + this.id + '"]')) document.querySelector('#svg g[data-id="' + this.id + '"]').insertAdjacentHTML('beforeend', rect);
    }

    polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {

        var angleInRadians = this.degToRad(angleInDegrees);

        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    describeArc = (x, y, radius, startAngle, endAngle) => {

        var endAngleOriginal = endAngle;
        if (endAngleOriginal - startAngle === 360) {
            endAngle = 359;
        }

        var start = this.polarToCartesian(x, y, radius, endAngle);
        var end = this.polarToCartesian(x, y, radius, startAngle);

        var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

        if (endAngleOriginal - startAngle === 360) {
            var d = [
                "M", start.x, start.y,
                "A", radius, radius, 0, arcSweep, 0, end.x, end.y, "z"
            ].join(" ");
        }
        else {
            var d = [
                "M", start.x, start.y,
                "A", radius, radius, 0, arcSweep, 0, end.x, end.y
            ].join(" ");
        }

        return d;
    }

    /**
     * Converts degrees to radians
     * 
     * @param deg {Integer}
     * @returns {Integer} - radians
     */
    degToRad = (deg) => {

        return (deg - 90) * Math.PI / 180.0;
    }

    /**
     * Returns copy of original polygon, selected and moved by (10,10) from it
     * 
     * @param len {Integer}
     * @returns {Area} - a copy of original area
     */
    genID = (len) => {

        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

        for (let i = 0; i < len; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    getPath = () => {

        return this.points;
    }

    getID = () => {

        return this.id;
    }
}