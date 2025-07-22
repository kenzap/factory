import { degToRad } from "../_/_helpers.js";

export class Polyline {

    constructor(data) {

        this.data = data;

        this.id = data.id ? data.id : this.genID(6);

        this.mode = data.mode ? data.mode : 'annotate';

        this.arrow = data.annotation && data.annotation.includes('arrow') ? true : false;

        this.annotation = data.annotation ? data.annotation : 'line';

        this.arrowCoords = [{ x: 2, y: 7 }, { x: 0, y: 0 }, { x: 11, y: 7 }, { x: 0, y: 14 }];

        this.rect = data.rect ? data.rect : '';

        this.selected = null;

        this.style = {
            stroke_width: '3px',
            stroke: '#00F',
            fill: 'rgba(255, 255, 255, 0)'
        }

        this.draw(data.points);
    }

    /**
     * Redraw this area with own or custom coordinates
     * 
     * @param coords {Object} [coords=undefined]
     * @returns {Area} - this area
     */
    draw = (points) => {

        if (this.mode != 'annotate') return;

        let polyLine = `<g data-id="${this.id}" data-type="polyline" data-arrow="${this.arrow}" data-annotation="${this.annotation}"><polyline data-id="${this.id}" points="${this.polyPoints(points)}" style="stroke-width:${this.style.stroke_width};stroke:${this.style.stroke};fill:${this.style.fill};"></polyline></g>`;
        document.querySelector("#svg").insertAdjacentHTML('beforeend', polyLine);

        this.drawCircle('start', points);

        return this;
    };

    /**
     * Set attributes for svg-elements of area by new parameters
     * 
     * @param coords {Object} - Object with coords of this area, with field 'points'
     */
    setCoords = (data) => {

        if (!document.querySelector('#svg polyline[data-id="' + this.id + '"]')) return;

        let poly_points = document.querySelector('#svg polyline[data-id="' + this.id + '"]').getAttribute('points');

        let poly_points_arr = poly_points.split(' ');

        if (data.mode == 'annotate') {

            if (poly_points_arr.length > 3) { poly_points_arr = poly_points_arr.splice(0, 2); }

            if (document.querySelector('#svg polyline[data-id="' + this.id + '"]')) document.querySelector('#svg polyline[data-id="' + this.id + '"]').setAttribute('points', (poly_points_arr.join(" ") + " " + this.polyPoints(data.points)).trim());
        }

        if (data.mode == 'editing') {

            switch (this.rect) {

                case 'start':
                    poly_points_arr[0] = data.points[0].x;
                    poly_points_arr[1] = data.points[0].y;
                    break;
                case 'end':
                    poly_points_arr[2] = data.points[0].x;
                    poly_points_arr[3] = data.points[0].y;
                    break;
            }

            if (document.querySelector('#svg polyline[data-id="' + this.id + '"]')) document.querySelector('#svg polyline[data-id="' + this.id + '"]').setAttribute('points', poly_points_arr.join(" "));
            if (document.querySelector('#svg rect[data-id="' + this.rect + this.id + '"]')) {

                document.querySelector('#svg rect[data-id="' + this.rect + this.id + '"]').setAttribute('x', data.points[0].x - 4);
                document.querySelector('#svg rect[data-id="' + this.rect + this.id + '"]').setAttribute('y', data.points[0].y - 4);
            }

            if (this.arrow) this.drawArrow(data.points);
        }
    }

    drawArrow = (points) => {

        if (!document.querySelector('#svg rect[data-id="end' + this.id + '"]')) return;

        let xe = parseInt(document.querySelector('#svg rect[data-id="end' + this.id + '"]').getAttribute('x')), ye = parseInt(document.querySelector('#svg rect[data-id="end' + this.id + '"]').getAttribute('y'));
        let xs = document.querySelector('#svg rect[data-id="start' + this.id + '"]').getAttribute('x'), ys = document.querySelector('#svg rect[data-id="start' + this.id + '"]').getAttribute('y');

        let deg = Math.atan2(parseFloat(xe) - parseFloat(xs), parseFloat(ye) - parseFloat(ys)) * 180 / Math.PI * -1;

        if (document.querySelector('#svg polygon[data-id="arrow' + this.id + '"]')) document.querySelector('#svg polygon[data-id="arrow' + this.id + '"]').remove();

        this.arrowCoords = [
            { x: (xe + 5 + (5 * Math.cos(degToRad(deg + 90)))), y: (ye + 5 + (5 * Math.sin(degToRad(deg + 90)))) },
            { x: (xe + 5 + (16 * Math.cos(degToRad(deg + 180)))), y: (ye + 5 + (16 * Math.sin(degToRad(deg + 180)))) },
            { x: (xe + 5 + (5 * Math.cos(degToRad(deg + 270)))), y: (ye + 5 + (5 * Math.sin(degToRad(deg + 270)))) },
        ];

        let arrowPoints = this.arrowCoords.map(p => (parseInt(p.x)) + "," + (parseInt(p.y))).join(' ')
        let arrowPolygon = `<polygon data-id="arrow${this.id}" points="${arrowPoints}" />`;

        if (document.querySelector('#svg g[data-id="' + this.id + '"]')) document.querySelector('#svg g[data-id="' + this.id + '"]').insertAdjacentHTML('beforeend', arrowPolygon);
    }

    /**
     * Set attributes for svg-elements of area by new parameters
     * 
     * @param coords {Object} - Object with coords of this area, with field 'points'
     */
    setEndCoords = (points) => {

        if (!document.querySelector('#svg polyline[data-id="' + this.id + '"]')) return;

        // console.log(points);
        this.setCoords(points);
        this.drawCircle('end', points.points);

        // remove same dot lines 
        let poly_points = document.querySelector('#svg polyline[data-id="' + this.id + '"]').getAttribute('points');
        let poly_points_arr = poly_points.split(' ');

        if (poly_points_arr[0] == poly_points_arr[2] && poly_points_arr[1] == poly_points_arr[3]) document.querySelector('#svg g[data-id="' + this.id + '"]').remove();
    }

    /**
     * Moving circle rect object
     * 
     * @param coords {Object} - Object with coords of this area, with field 'points'
     */
    drawCircle = (type, points) => {

        // console.log(points);

        let rect = `<rect data-id="${type + this.id}" x="${points[0].x - 4}" y="${points[0].y - 4}" class="po" data-type="polyline" data-rect="${type}" width="8" height="8" rx="8" style="stroke-width:2px;stroke:${this.style.stroke};fill:rgba(255,255,255,1);" />`;
        if (document.querySelector('#svg g[data-id="' + this.id + '"]')) document.querySelector('#svg g[data-id="' + this.id + '"]').insertAdjacentHTML('beforeend', rect);

        if (this.arrow) this.drawArrow(points);
    }

    /**
     * Converts polyline points from object to string. Example:
     * [{x: 12, y: 100},{x: 15, y: 150}]
     * 12 100 15 150
     * @param points {Object} - Object with coords of this area, with field 'points'
     * @returns {String} - string of points
     */
    polyPoints = (points) => {

        return (points.reduce(function (previousValue, currentItem) {
            return previousValue + currentItem.x + ' ' + currentItem.y + ' ';
        }, '')).trim();
    }

    /**
     * Return current polyline id
     * @returns {String} - string of points
     */
    getID = () => {

        return this.id
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
}