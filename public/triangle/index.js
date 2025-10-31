import { getHome } from "../_/api/get_home.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Session } from "../_/modules/session.js";

/**
 * Right-Angled Triangle Calculator
 * Shows triangle calculations and allows editing values.
 * 
 * @version 1.0
 */
class Triangle {
    constructor() {
        this.standardVal = null;
        this.noOfSF = 4;
        this.inputIs = null;
        this.outputIs = null;
        this.errorIs = null;
        this.countEnts = 0;
        this.typeIs = 0;
        this.numUnits = 6;
        this.R2deg = 180 / Math.PI;
        this.D2rad = Math.PI / 180;
        this.inValArray = new Array();
        this.outArray = new Array();
        this.outValArray = new Array();
        this.origsArray = new Array();
        this.valuesIn = "N";

        this.init();
    }

    init() {

        getHome((response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;

            // locale
            new Locale(response);

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Triangle'),
                icon: 'bi bi-grid',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            this.createHTML();
            this.startUp();
        });
    }

    createHTML() {


        document.querySelector('#app').innerHTML = `
            <center>
                <table bgcolor="#AAFFDD" cellspacing="10">
                    <tr align="CENTER">
                        <td>
                            <form name="UniForm">
                                <table border="0">
                                    <tr align="CENTER">
                                        <td>
                                            <input name="Message" size="70" value="Type sizes in any TWO empty boxes, then click on [Calculate It]" onfocus="this.blur()" type="TEXT">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT">
                                            <b>Show values to . . .
                                            <select name="SigFigs" size="1" onchange="window.triangle.calculateIt()">
                                                <option value="0">3</option>
                                                <option selected value="1">4</option>
                                                <option value="2">5</option>
                                                <option value="3">6</option>
                                                <option value="4">7</option>
                                                <option value="5">8</option>
                                                <option value="6">9</option>
                                            </select>
                                            significant figures</b>.
                                        </td>
                                    </tr>
                                </table>
                                
                                <table border="0" cellpadding="5">
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><font size="2">edge</font> <font color="#FF0000"><b><i>a</i></b></font> =</font></td>
                                        <td><input name="Unit1" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>units</i></font></td>
                                        <td><input value="[ Calculate It ]" onclick="window.triangle.calculateIt()" type="BUTTON"></td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><font size="2">edge</font> <font color="#FF0000"><b><i>b</i></b></font> =</font></td>
                                        <td><input name="Unit2" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>units</i></font></td>
                                        <td rowspan="4" valign="CENTER"><img src="/assets/img/arittri.gif" alt="Right Triangle"></td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><font size="2">edge</font> <font color="#FF0000"><b><i>c</i></b></font> =</font></td>
                                        <td><input name="Unit3" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>units</i></font></td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><font size="2">angle</font> <b>A</b> =</font></td>
                                        <td><input name="Unit4" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>degrees</i></font></td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><font size="2">angle</font> <b>B</b> =</font></td>
                                        <td><input name="Unit5" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>degrees</i></font></td>
                                    </tr>
                                    <tr>
                                        <td align="RIGHT"><font face="ARIAL"><b>area</b> =</font></td>
                                        <td><input name="Unit6" size="20" maxlength="20" type="TEXT"></td>
                                        <td align="LEFT"><font size="2"><i>square units</i></font></td>
                                        <td><input value="[ Clear All ]" onclick="window.triangle.startUp()" type="BUTTON"></td>
                                    </tr>
                                </table>
                            </form>
                        </td>
                    </tr>
                </table>
            </center>
        `;
    }

    getInputs() {
        let origIs;
        this.countEnts = 0;
        this.typeIs = 0;

        // Process each input field
        for (let i = 1; i <= 6; i++) {
            this.inputIs = document.UniForm[`Unit${i}`].value;
            origIs = this.inputIs;
            this.inputIs = this.cutSpaces(this.inputIs);

            if (this.testInput(this.inputIs) === "N") {
                return "N";
            }

            if (this.inputIs > 0) {
                // Angle validation
                if ((i === 4 || i === 5) && this.inputIs >= 90) {
                    this.errorIs = ` Angle ${i === 4 ? 'A' : 'B'} must be less than 90 degrees. `;
                    return "N";
                }

                this.inValArray[i] = this.inputIs;
                this.origsArray[i] = origIs;
                this.countEnts++;
                this.typeIs += Math.pow(2, i - 1);
            }
        }

        if (this.countEnts > 2) {
            this.errorIs = " ONLY TWO entries allowed. ";
            return "N";
        }
        if (this.countEnts < 2) {
            this.errorIs = " TWO (non-zero) entries are needed. ";
            return "N";
        }
        return "Y";
    }

    calculateIt() {
        if (this.valuesIn === "Y") {
            this.adjustOutputValues();
            return;
        }

        if (this.getInputs() === "N") {
            document.UniForm.Message.value = this.errorIs + " Click on [Clear All]";
            return;
        }

        if (this.checkAnomalies() === "N") {
            document.UniForm.Message.value = this.errorIs + " Click on [Clear All]";
            return;
        }

        if (this.makeStandardValues() === "N") {
            document.UniForm.Message.value = this.errorIs + " Click on [Clear All]";
            return;
        }

        this.makeOutputValues();
        this.adjustOutputValues();
    }

    checkAnomalies() {
        switch (this.typeIs) {
            case 5:
                if (eval(this.inValArray[3]) <= eval(this.inValArray[1])) {
                    this.errorIs = "  Hypotenuse (edge c) must be more than edge a  ";
                    return "N";
                }
                break;
            case 6:
                if (eval(this.inValArray[3]) <= eval(this.inValArray[2])) {
                    this.errorIs = "  Hypotenuse (edge c) must be more than edge b  ";
                    return "N";
                }
                break;
            case 24:
                const totalAB = eval(this.inValArray[4]) + eval(this.inValArray[5]);
                if (totalAB !== 90) {
                    this.errorIs = " Angle A + angle B must equal 90 degrees. ";
                    return "N";
                } else {
                    this.errorIs = "2 angles will not do: some other size needed.";
                    return "N";
                }
            case 36:
                if (Math.pow(this.inValArray[3], 4) < 16 * Math.pow(this.inValArray[6], 2)) {
                    this.errorIs = " Given conditions are impossible.  ";
                    return "N";
                }
                break;
        }
        return "Y";
    }

    makeStandardValues() {
        switch (this.typeIs) {
            case 3: break;
            case 5:
                this.inValArray[2] = Math.sqrt(Math.pow(this.inValArray[3], 2) - Math.pow(this.inValArray[1], 2));
                break;
            case 9:
                this.inValArray[2] = this.inValArray[1] / Math.tan(this.inValArray[4] * this.D2rad);
                break;
            case 17:
                this.inValArray[2] = this.inValArray[1] * Math.tan(this.inValArray[5] * this.D2rad);
                break;
            case 6:
                this.inValArray[1] = Math.sqrt(Math.pow(this.inValArray[3], 2) - Math.pow(this.inValArray[2], 2));
                break;
            case 10:
                this.inValArray[1] = this.inValArray[2] * Math.tan(this.inValArray[4] * this.D2rad);
                break;
            case 18:
                this.inValArray[1] = this.inValArray[2] / Math.tan(this.inValArray[5] * this.D2rad);
                break;
            case 12:
                this.inValArray[1] = this.inValArray[3] * Math.sin(this.inValArray[4] * this.D2rad);
                this.inValArray[2] = this.inValArray[3] * Math.cos(this.inValArray[4] * this.D2rad);
                break;
            case 20:
                this.inValArray[1] = this.inValArray[3] * Math.cos(this.inValArray[5] * this.D2rad);
                this.inValArray[2] = this.inValArray[3] * Math.sin(this.inValArray[5] * this.D2rad);
                break;
        }
        return "Y";
    }

    makeOutputValues() {
        this.outArray[1] = this.inValArray[1];
        this.outArray[2] = this.inValArray[2];
        this.outArray[3] = Math.sqrt(Math.pow(this.outArray[1], 2) + Math.pow(this.outArray[2], 2));
        this.outArray[4] = Math.atan(this.outArray[1] / this.outArray[2]) * this.R2deg;
        this.outArray[5] = Math.atan(this.outArray[2] / this.outArray[1]) * this.R2deg;
        this.outArray[6] = this.outArray[1] * this.outArray[2] / 2;
    }

    adjustOutputValues() {
        this.noOfSF = document.UniForm.SigFigs.selectedIndex + 3;
        if (this.noOfSF < 3) this.noOfSF = 3;
        if (this.noOfSF > 9) this.noOfSF = 9;

        for (let i = 0; i < this.numUnits + 1; i++) {
            const output = this.controlFormat(this.outArray[i]);
            this.outValArray[i] = output;
        }
        this.loadOutputValues();
        this.restoreOriginals();
    }

    loadOutputValues() {
        document.UniForm.Message.value = "Adjust significant figs. OR click on [Clear All]";
        for (let i = 1; i <= 6; i++) {
            document.UniForm[`Unit${i}`].value = this.outValArray[i] || "";
        }
        this.valuesIn = "Y";
    }

    cutSpaces(thisInput) {
        let temp = "";
        const splitString = ("" + thisInput).split(" ");
        for (let i = 0; i < splitString.length; i++) {
            temp += splitString[i];
        }
        while (temp.charAt(0) === "0") {
            temp = temp.substring(1);
        }
        return temp;
    }

    testInput(toTest) {
        const testThis = "" + toTest;
        const allow = "1234567890-.";

        if (testThis === "N") {
            this.errorIs = " All inputs MUST be numbers ";
            return "N";
        }

        for (let i = 0; i < testThis.length; i++) {
            const charIs = testThis.charAt(i);
            if (allow.indexOf(charIs) === -1) {
                this.errorIs = "One input NOT a valid number. ";
                return "N";
            }
        }

        const testNum = Number(toTest);
        if (isNaN(testNum)) {
            this.errorIs = " One input NOT a valid number. ";
            return "N";
        }
        if (testNum > 1e9) {
            this.errorIs = " One input TOO BIG! (> 1 000 000 000) ";
            return "N";
        }
        if (testNum < 1e-5 && testNum > 0) {
            this.errorIs = " One input TOO SMALL! (< 0.000 01) ";
            return "N";
        }
        if (testNum < 0) {
            this.errorIs = " No input can be NEGATIVE! ";
            return "N";
        }
        return "Y";
    }

    controlFormat(numIs) {
        const num = Number(numIs);
        if (Math.abs(num) < 1e-12) return "0";
        if (num === 0) return "0";

        const signIs = num < 0 ? "-" : "";
        const absNum = Math.abs(num);

        if (absNum > 1e15 || absNum < 1e-7) {
            return signIs + absNum.toExponential(this.noOfSF - 1);
        } else {
            return signIs + absNum.toPrecision(this.noOfSF);
        }
    }

    restoreOriginals() {
        // Restore original input values based on typeIs
        const restoreMap = {
            3: [1, 2], 5: [1, 3], 9: [1, 4], 17: [1, 5], 33: [1, 6],
            6: [2, 3], 10: [2, 4], 18: [2, 5], 34: [2, 6],
            12: [3, 4], 20: [3, 5], 36: [3, 6], 24: [4, 5],
            40: [4, 6], 48: [5, 6]
        };

        const indices = restoreMap[this.typeIs];
        if (indices) {
            indices.forEach(i => {
                if (this.origsArray[i]) {
                    document.UniForm[`Unit${i}`].value = this.origsArray[i];
                }
            });
        }
    }

    startUp() {
        this.clearAll();
        document.UniForm.Message.value = "Type sizes in any TWO empty boxes, then click on [Calculate It]";
    }

    clearAll() {
        for (let i = 0; i < this.numUnits + 1; i++) {
            this.outValArray[i] = "";
            this.origsArray[i] = "";
        }
        this.loadOutputValues();
        this.valuesIn = "N";
    }
}

window.triangle = new Triangle();