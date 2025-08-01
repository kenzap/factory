import { __html } from '@kenzap/k-cloud';

/**
 * @name setCookie
 * @description Set cookie by its name to all .kenzap.com subdomains
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {string} days - Number of days when cookie expires.
 */
export const setCookie = (name, value, days) => {

	let expires = "";
	if (days) {
		let date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = ";expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + (escape(value) || "") + expires + ";path=/";
}

/**
 * @name getParam
 * @description Get URL param.
 * 
 * @returns {string} id - Kenzap Cloud space ID.
 */
export const getParam = (p) => {

	let urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(p) ? urlParams.get(p) : "";
}

export const formatTime = (timestamp) => {

	let a = new Date(timestamp * 1000);
	let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	let year = a.getFullYear();
	let month = months[a.getMonth()];
	let date = a.getDate();
	let hour = a.getHours();
	let min = a.getMinutes();
	let sec = a.getSeconds();
	let time = date + ' ' + month + ' ' + year; // + ' ' + hour + ':' + min + ':' + sec ;
	return time;
}