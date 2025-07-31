import { API } from "../helpers/global.js";

// Updated uploadFile function with proper error handling
export function uploadFile(formData, callback, errorCallback) {
    return fetch(API() + '/api/upload-file/', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                callback(data);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            if (errorCallback) {
                errorCallback(error);
            } else {
                toast(__html("Upload failed: " + error.message));
            }
        });
}