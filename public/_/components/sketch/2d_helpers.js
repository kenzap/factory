import { rotateDEG, translate, compose, applyToPoints } from 'transformation-matrix';

/**
 * Rotates zone according to provided angle.
 * More about methods https://www.npmjs.com/package/transformation-matrix#rotate
 * 
 * @param area {Object} - zone object instance
 * @param angle {number} - angle degree for rotation
 * @return area {Object} - rotated area containing new coordinates
 */
export const rotate = (points, angle) => {

    // find center point before rotation
    let cp = getCenterPoint(points);

    // do polygon rotation config
    let matrixAngle = compose(rotateDEG(angle)); // translate(-cp.x,-cp.y),

    // do transformation 
    let rotatedZonePoints = applyToPoints(matrixAngle, points);

    // find center point after rotation
    let cpa = getCenterPoint(rotatedZonePoints);

    // polygon is transformed around X 0, Y 0 point, fix rotation offset that results from default rotation
    let matrixMove = compose(translate(cp.x-cpa.x, cp.y-cpa.y));
    rotatedZonePoints = applyToPoints(matrixMove, rotatedZonePoints);

    return rotatedZonePoints;
}

/**
 * Get central point of the Polygon
 * 
 * @param points {Array} - array of objects with all Polygon points
 * @return coord {Object} - center X Y points
 */
export const getCenterPoint = (points) => {

    let xMin, xMax, yMin, yMax;
    let yM, xM;
    points.map((p) => {

        if(xMin === undefined) xMin = p.x;
        if(xMax === undefined) xMax = p.x;
        if(yMin === undefined) yMin = p.y;
        if(yMax === undefined) yMax = p.y;

        if(p.x > xMax) xMax = p.x;
        if(p.x < xMin) xMin = p.x;
        if(p.y > yMax) yMax = p.y;
        if(p.y < yMin) yMin = p.y;
    });

    xM = (xMax + xMin) / 2; 
    yM = (yMax + yMin) / 2; 

    return {x: xM, y: yM};
}