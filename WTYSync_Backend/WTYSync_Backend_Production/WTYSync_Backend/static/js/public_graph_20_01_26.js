const annotationValue = document.getElementById('annotationInput');
const applyButton = document.getElementById('applyAnnotation');
const errorMessage_threshold = document.getElementById('errorMessage_threshold');
const wrapper = document.getElementById('tempGraphWrapper');
var url = new URL(window.location.href);
var pathname = url.pathname;
var device_id = pathname.split('/').pop();
console.log("Device ID:!!!!!!!!!!!!", device_id);
console.log("annotationValue---------------", annotationValue);
const user_email = document.querySelector("h6[data-email]").getAttribute("data-email");

// Keep track of the previous panel name
let globalPanelName = "";

// Select all elements
const editButtons = document.querySelectorAll('.edit_name');
const panelapplyButtons = document.querySelectorAll('.apply_name');
const inputFields = document.querySelectorAll('.control_panel_edit');

editButtons.forEach((button, index) => {
    button.addEventListener('click', function () {
        const input = inputFields[index];
        const title = input.previousElementSibling; // Assuming h4 is right before input
        const applyBtn = panelapplyButtons[index];

        // Save the current name
        globalPanelName = input.value;

        // Show input, hide title
        title.style.display = "none";
        input.style.display = "inline-block";
        input.removeAttribute('readonly');
        input.focus();

        // Show Apply, hide Edit
        applyBtn.style.display = "inline-block";
        button.style.display = "none";
    });
});

panelapplyButtons.forEach((button, index) => {
    button.addEventListener('click', function () {
        const input = inputFields[index];
        const title = input.previousElementSibling; // h4
        const editBtn = editButtons[index];

        const newPanelName = input.value;

        // Update title with new value
        title.textContent = newPanelName;

        // Hide input, show title
        input.setAttribute('readonly', true);
        input.style.display = "none";
        title.style.display = "inline-block";

        // Hide Apply, show Edit
        button.style.display = "none";
        editBtn.style.display = "inline-block";

        // Send data to backend
        const data = {
            device_name: button.getAttribute('data-id').split('_')[1], // Extract device_name from data-id
            panel_name: newPanelName,
            old_panel_value: globalPanelName,
        };

        // Call the backend API to update the panel name
        fetch('/update_panel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(responseData => {
                console.log('Response from server:', responseData);
                button.style.display = "none";
                input.setAttribute('readonly', true);
                input.style.border = "none";
                if (responseData.status === 'success') {
                    alert("Panel name updated successfully!");

                    const rawId = input.id;
                    const idParts = rawId.replace("control_panel_edit_1_", "").split("_");

                    const deviceName = idParts.slice(0, 1).join(" ");
                    const newPanelName = input.value;

                    const sanitize = str => str.trim().replace(/\s+/g, '_');

                    const newDataId = `${sanitize(deviceName)}_${sanitize(newPanelName)}`;
                    const newInputId = `control_panel_edit_1_${newDataId}`;

                    input.setAttribute('data-id', newDataId);
                    input.id = newInputId;
                }
            })
            .catch(error => {
                console.error('Error updating panel name:', error);
            });

    });
});



function updateGraph() {
    let today = new Date();
    let formattedTodayDate = formatDateToYYYYMMDD(today);

    emitTemperatureData({
        startDate: formattedTodayDate,
        endDate: formattedTodayDate,
        timeSelect: 'daily'
    });
    updateGraph_temp_r_y_b('daily', formattedTodayDate, formattedTodayDate);
}

var graphControl = document.getElementById('controlPanelSelect_temp_r_y_b').value;

let socket;

fetch(ipJsonUrl)
    .then((res) => {
        if (!res.ok) {
            throw new Error('Failed to fetch IP address');
        }
        return res.json();
    })
    .then((data) => {
        const serverIP = data.ip;
        console.log("Fetched IP:", serverIP);
        setupSocketConnection(serverIP)
    })
    .catch((error) => {
        console.error('Error fetching IP address:', error);
    });

let totalPoints;
let stepSeconds;

let temp1;
let temp2;
let temp3;
let temp4;
let temp5;
let temp6;
let temp7;
let temp8;
let temp9;
let temp10;

let timerRef = null;


let array_define;
let email;
let NeutralAvailable = 0;

function setupSocketConnection(ip) {
    console.log("Connected to SocketIO server");
    socket = io.connect(ip);

    socket.on('connect', function () {
        console.log("ANJaLI")

        email = localStorage.getItem("email");
        console.log("Emitting user_connected with email:", email);

        // Emit the email to backend
        socket.emit("user_connected", { email });

        let today = new Date();
        let formattedTodayDate = formatDateToYYYYMMDD(today);
        console.log("emiting start");
        array_define = 0;
        emitTemperatureData({
            startDate: formattedTodayDate,
            endDate: formattedTodayDate,
            timeSelect: 'daily',
            controlGraph: graphControl

        });
    });

    
    socket.on('temperature_graph_data', function (data) {
        console.log('Received temperature data:', data);
        thresholdValue = data.threshold
        phase_values = data.phase_values;
        graph_duration = data.graph_duration;
        const result = data.result;
        const device_location = data.device_location;
        data = data.data;

        document.getElementById('deviceTitle').innerText = device_location;

        var graphControl = document.getElementById('controlPanelSelect_temp_r_y_b').value;

        console.log("result", result);
        
        // Update MIN and MAX values in the HTML
        for (let deviceName in result) {
            console.log("result-->", result);

            const deviceData = result[deviceName];

            // Loop through each sensor for the device
            for (let sensorName in deviceData) {
                const sensorData = deviceData[sensorName];

                // Grab the elements in the HTML by device and sensor
                const minValueElement = document.querySelector(`.dashboard_temp_min_value_div[data-device="${deviceName}"][data-sensor="${sensorName}"]`);
                const maxValueElement = document.querySelector(`.dashboard_temp_max_value_div[data-device="${deviceName}"][data-sensor="${sensorName}"]`);

                // Set the MIN and MAX values (fallback to 'N/A' if undefined)
                if (minValueElement) {
                    minValueElement.textContent = `${sensorData.MIN || '-'}` + "\u00B0C";
                }
                if (maxValueElement) {
                    maxValueElement.textContent = `${sensorData.MAX || '-'}` + "\u00B0C";
                }
            }
        }


        // Graph duration in seconds from backend
        stepSeconds = graph_duration;
        totalPoints = Math.floor(86400 / stepSeconds); // 86400 seconds in a day

        sleeping = stepSeconds * 1000;


        if (timerRef) clearTimeout(timerRef);

        // scheduleNextFetch()

        const currentTimeSelect = document.getElementById('timeframeSelect_temp_r_y_b').value;
        let labels = generateTimeLabels(stepSeconds);

        if (array_define === 0) {
            temp1 = Array(totalPoints).fill(null);
            temp2 = Array(totalPoints).fill(null);
            temp3 = Array(totalPoints).fill(null);
            temp4 = Array(totalPoints).fill(null);
            temp5 = Array(totalPoints).fill(null);
            temp6 = Array(totalPoints).fill(null);
            temp7 = Array(totalPoints).fill(null);
            temp8 = Array(totalPoints).fill(null);
            temp9 = Array(totalPoints).fill(null);
            temp10 = Array(totalPoints).fill(null);
        }

        // To show values of phases in boxes 
        for (let deviceId in phase_values) {
            const panels = phase_values[deviceId];

            for (let panelName in panels) {
                const sensors = panels[panelName];

                // Construct the base class or ID selectors
                const panelContainer = document.querySelector(`div[data-device-id="${deviceId}"][data-panel-name="${panelName}"]`);

                if (!panelContainer) {
                    console.log("Panel container not found for device:", deviceId, "panel:", panelName);
                    continue;
                }

                // Find all phase sensor blocks in this panel
                const sensorBlocks = panelContainer.querySelectorAll('.lux_graph_level_indv_div');

                sensorBlocks.forEach(block => {
                    const sensorTitle = block.querySelector('.lux_graph_level_title_img_main_div h4');
                    const sensorValueDiv = block.querySelector('.lux_graph_level_temp_value_div');

                    if (!sensorTitle || !sensorValueDiv) return;
                    const sensorName = sensorTitle.innerText.trim();  // e.g., 'R1', 'Y1', 'B1', 'N'
                    const newValue = sensors[sensorName];  // Get the corresponding value from the sensors data

                    if (newValue !== undefined) {
                        if (newValue === null) {
                            sensorValueDiv.innerText = "--\u00B0C";
                        } else {
                            sensorValueDiv.innerText = `${newValue}` + "\u00B0C";  // Update the temperature value
                        }
                    }
                });
            }
        }

        // Process data and map it to the correct time intervals
        if (currentTimeSelect === 'set-date') {
            const dateRangePicker = document.getElementById('dateRange_temp_r_y_b')._flatpickr;
            const startDate = dateRangePicker.selectedDates[0];
            const endDate = dateRangePicker.selectedDates[0];

            if (startDate && endDate) {

                data.forEach((row) => {
                    // const timeIndex = getTimeIndex(row.minute);
                    const timeIndex = getTimeIndex(row.minute, stepSeconds);
                    if (timeIndex === -1) return;

                    if (!graphControl === 'all') {
															  

                        Object.entries(row).forEach(([key, value]) => {
                            if (typeof value !== 'number') return;

                            if (key.startsWith('temperature_R')) {
                                temp1[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y')) {
                                temp2[timeIndex] = value;
                            } else if (key.startsWith('temperature_B')) {
                                temp3[timeIndex] = value;
                            } else if (key.startsWith('temperature_N')) {
                                temp4[timeIndex] = value;
                                NeutralAvailable = 1;
                            }
                        });
                    } else {
                        Object.entries(row).forEach(([key, value]) => {
                            if (typeof value !== 'number') return;

                            if (key.startsWith('temperature_R1')) {
                                temp1[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y1')) {
                                temp2[timeIndex] = value;
                            } else if (key.startsWith('temperature_B1')) {
                                temp3[timeIndex] = value;
                            } else if (key.startsWith('temperature_R2')) {
                                temp4[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y2')) {
                                temp5[timeIndex] = value;
                            } else if (key.startsWith('temperature_B2')) {
                                temp6[timeIndex] = value;
                            } else if (key.startsWith('temperature_R3')) {
                                temp7[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y3')) {
                                temp8[timeIndex] = value;
                            } else if (key.startsWith('temperature_B3')) {
                                temp9[timeIndex] = value;
                            } else if (key.startsWith('temperature_N')) {
                                temp10[timeIndex] = value;
                                NeutralAvailable = 1;
                            }
                        });
                    }
                });

                updateGraph_temp_r_y_b(labels, temp1, temp2, temp3, temp4, temp5, temp6, temp7, temp8, temp9, temp10);
            } else {
                console.error('Start or end date is not selected.');
            }
        } else if (currentTimeSelect === 'daily') {
            console.log("data is ", data);

            const anyDataExists = [temp1, temp2, temp3, temp4, temp5, temp6, temp7, temp8, temp9, temp10].some(arr =>
                arr.some(val => val !== null)
            );
            console.log("anyDataExists", anyDataExists)


            if (!anyDataExists) {
                console.log("hdfjsdjfhgsdjfsdj")
                data.forEach((row) => {
                    const timeIndex = getTimeIndex(row.minute, stepSeconds);
                    if (timeIndex === -1) return;

                    if (!graphControl === 'all') {
                        Object.entries(row).forEach(([key, value]) => {
                            if (typeof value !== 'number') return;

                            if (key.startsWith('temperature_R')) {
                                temp1[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y')) {
                                temp2[timeIndex] = value;
                            } else if (key.startsWith('temperature_B')) {
                                temp3[timeIndex] = value;
                            } else if (key.startsWith('temperature_N')) {
                                temp4[timeIndex] = value;
                                NeutralAvailable = 1;
                            }
                        });
                    } else {
                        Object.entries(row).forEach(([key, value]) => {
                            if (typeof value !== 'number') return;

                            if (key.startsWith('temperature_R1')) {
                                temp1[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y1')) {
                                temp2[timeIndex] = value;
                            } else if (key.startsWith('temperature_B1')) {
                                temp3[timeIndex] = value;
                            } else if (key.startsWith('temperature_R2')) {
                                temp4[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y2')) {
                                temp5[timeIndex] = value;
                            } else if (key.startsWith('temperature_B2')) {
                                temp6[timeIndex] = value;
                            } else if (key.startsWith('temperature_R3')) {
                                temp7[timeIndex] = value;
                            } else if (key.startsWith('temperature_Y3')) {
                                temp8[timeIndex] = value;
                            } else if (key.startsWith('temperature_B3')) {
                                temp9[timeIndex] = value;
                            } else if (key.startsWith('temperature_N')) {
                                temp10[timeIndex] = value;
                                NeutralAvailable = 1;
                            }
                        });
                    }
                });

                array_define = 1;
                updateGraph_temp_r_y_b(labels, temp1, temp2, temp3, temp4, temp5, temp6, temp7, temp8, temp9, temp10);
            } else {
                const lastRow = data[data.length - 1];
                const timeIndex = getTimeIndex(lastRow.minute, stepSeconds);

                if (graphControl === 'all') {

                    Object.entries(lastRow).forEach(([key, value]) => {
                        if (typeof value !== 'number') return;

                        if (key.startsWith('temperature_R1') && (temp1[timeIndex] === null || temp1[timeIndex] === undefined)) {
                            temp1[timeIndex] = value;
                        } else if (key.startsWith('temperature_Y1') && (temp2[timeIndex] === null || temp2[timeIndex] === undefined)) {
                            temp2[timeIndex] = value;
                        } else if (key.startsWith('temperature_B1') && (temp3[timeIndex] === null || temp3[timeIndex] === undefined)) {
                            temp3[timeIndex] = value;
                        } else if (key.startsWith('temperature_R2') && (temp4[timeIndex] === null || temp4[timeIndex] === undefined)) {
                            temp4[timeIndex] = value;
                        } else if (key.startsWith('temperature_Y2') && (temp5[timeIndex] === null || temp5[timeIndex] === undefined)) {
                            temp5[timeIndex] = value;
                        } else if (key.startsWith('temperature_B2') && (temp6[timeIndex] === null || temp6[timeIndex] === undefined)) {
                            temp6[timeIndex] = value;
                        } else if (key.startsWith('temperature_R3') && (temp7[timeIndex] === null || temp7[timeIndex] === undefined)) {
                            temp7[timeIndex] = value;
                        } else if (key.startsWith('temperature_Y3') && (temp8[timeIndex] === null || temp8[timeIndex] === undefined)) {
                            temp8[timeIndex] = value;
                        } else if (key.startsWith('temperature_B3') && (temp9[timeIndex] === null || temp9[timeIndex] === undefined)) {
                            temp9[timeIndex] = value;
                        } else if (key.startsWith('temperature_N') && (temp10[timeIndex] === null || temp10[timeIndex] === undefined)) {
                            temp10[timeIndex] = value;
                        }
                    });
                } else {
                    Object.entries(row).forEach(([key, value]) => {
                        if (typeof value !== 'number') return;

                        if (key.startsWith('temperature_R') && (temp1[timeIndex] === null || temp1[timeIndex] === undefined)) {
                            temp1[timeIndex] = value;
                        } else if (key.startsWith('temperature_Y') && (temp2[timeIndex] === null || temp2[timeIndex] === undefined)) {
                            temp2[timeIndex] = value;
                        } else if (key.startsWith('temperature_B') && (temp3[timeIndex] === null || temp3[timeIndex] === undefined)) {
                            temp3[timeIndex] = value;
                        } else if (key.startsWith('temperature_N') && (temp4[timeIndex] === null || temp4[timeIndex] === undefined)) {
                            temp4[timeIndex] = value;
                        }
                    });
                }

                chart_temp_r_y_b.update();

            }

        } else {
            console.error('Invalid time selection type.');
        }
    });

    const url = window.location.href;

    const device_id = url.split('/').filter(Boolean).pop();
    const currentDeviceSuffix = device_id.slice(-6);  // e.g., F0BF2F

    // const shownAlerts = new Map();

    socket.on('new_alert', function (data) {
        console.log("New Alert Received:", data);

        const alertSuffix = data.device_name.slice(-6);

        if (alertSuffix !== currentDeviceSuffix) {
            console.log("Alert ignored for other device:", data.device_name);
            return;
        }

        console.log("formattedTimestamp-->")

        // Format timestamp
        const date = new Date(data.timestamp);
        const options = {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        const formattedTimestamp = date.toLocaleString('en-GB', options)
            .replace(',', '')
            .replace(/(\d{2}:\d{2}:\d{2})/, ', $1');

        console.log("formattedTimestamp-->", formattedTimestamp)

        const container = document.querySelector('.temp_alert_box_main_div');
        if (!container) {
            console.error("Alert container not found!");
            return;
        }

        // Check if an alert with same message and device already exists
        const existingAlert = container.querySelector(
            `.alert-box[data-device-name="${data.device_name}"][data-alert-message="${data.message}"]`
        );

        if (existingAlert) {
            console.log("Duplicate alert found. Updating timestamp...");
            const timestampDiv = existingAlert.querySelector('.temp_alert_time');
            if (timestampDiv) {
                timestampDiv.textContent = formattedTimestamp;
            }
            return; // Skip inserting a new alert
        }

        // Insert new alert block if not already shown
        const alertHTML = `
        <div class="mt-4 p-1 temp_r_y_b_alert_box_div">
            <div class="alert-box" data-alert-message="${data.message}" data-device-name="${data.device_name}">
                <div class="d-flex justify-content-end">
                    <img class="temp_alert_box_close" src="../static/img/alert_cross_close.svg" onclick="deleteAlert(this)">
                </div>
                <div class="text-center temp_r_y_b_alert_box_title">
                    <img class="temp_alert_icon" src="../static/img/alert.svg">
                    Alert (${data.exceeded_phases})
                </div>
                <div class="text-center temp_r_y_b_alert_box_description mt-2">${data.message}</div>
                <div class="mt-2 pb-3 temp_alert_time">${formattedTimestamp}</div>
            </div>
        </div>
    `;

        container.insertAdjacentHTML('afterbegin', alertHTML);
    });

    function generateTimeLabels(stepSeconds) {
        const labels = [];
        for (let i = 0; i < 86400; i += stepSeconds) {
            const totalMinutes = Math.floor(i / 60);
            const hour = Math.floor(totalMinutes / 60);
            const minute = totalMinutes % 60;
            const second = i % 60;

            let label;
            if (stepSeconds >= 60) {
                // If interval is 1 minute or more, show HH:MM
                label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            } else {
                // If interval is less than 1 minute, show HH:MM:SS
                label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
            }

            labels.push(label);
        }
        return labels;
    }

    function getTimeIndex(time, stepSeconds) {
        if (!time || typeof time !== 'string') {
            console.warn('Invalid time value passed to getTimeIndex:', time);
            return -1;
        }

        const parts = time.split(':').map(Number);
        const hour = parts[0] || 0;
        const minute = parts[1] || 0;
        const second = parts[2] || 0;

        const totalSeconds = hour * 3600 + minute * 60 + second;
        const index = Math.floor(totalSeconds / stepSeconds);

        return index >= 0 && index < totalPoints ? index : -1;
    }
}

let isSetDateActive_temp_r_y_b = false;
let selectedStartDate_temp_r_y_b, selectedEndDate_temp_r_y_b;

function formatDate(date) {
    const d = new Date(date);
    let month = (d.getMonth() + 1).toString().padStart(2, '0');
    let day = d.getDate().toString().padStart(2, '0');
    let year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

// Function to format date to YYYY-MM-DD 
function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', function () {
    flatpickr("#dateRange_temp_r_y_b", {
        mode: "single", // single mode
        dateFormat: "d/m/Y",
        onChange: function (selectedDates) {
            if (selectedDates.length === 1) {
                const startDate_temp_r_y_b = selectedDates[0];
                const endDate_temp_r_y_b = selectedDates[0];
                // Displaying selected date as both start and end
                document.getElementById('startDateDisplay_temp_r_y_b').innerText = `Start Date: ${formatDate(startDate_temp_r_y_b)}`;
                document.getElementById('endDateDisplay_temp_r_y_b').innerText = `End Date: ${formatDate(endDate_temp_r_y_b)}`;
            }
        }
    });
});
var ctx_temp_r_y_b = document.getElementById('myChart_temp_r_y_b').getContext('2d');
var chart_temp_r_y_b;

const blueGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
blueGradient.addColorStop(0, '#2959FF');
blueGradient.addColorStop(1, '#9EB3FC');


const pinkGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
pinkGradient.addColorStop(0, '#f5237bff');
pinkGradient.addColorStop(1, '#f5237bff');


const darkblueGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
darkblueGradient.addColorStop(0, '#d5c5ffff');
darkblueGradient.addColorStop(1, '#d5c5ffff');

const lemonGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
lemonGradient.addColorStop(0, '#fffd8dff');
lemonGradient.addColorStop(1, '#fffd8dff');


const violetGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
violetGradient.addColorStop(0, '#ff74a2ff');
violetGradient.addColorStop(1, '#ff74a2ff');

const lightblueGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
lightblueGradient.addColorStop(0, '#a9ceffff');
lightblueGradient.addColorStop(1, '#a9ceffff');


const orangeGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
orangeGradient.addColorStop(0, '#ffbb6dff');
orangeGradient.addColorStop(1, '#ffbb6dff');

const redGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
redGradient.addColorStop(0, '#FF5B5B');
redGradient.addColorStop(1, '#FFB2B2');

const yellowGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
yellowGradient.addColorStop(0, '#FFC107');
yellowGradient.addColorStop(1, '#FFE082');

const blackGradient = ctx_temp_r_y_b.createLinearGradient(0, 0, 0, 400);
blackGradient.addColorStop(0, '#000000');
blackGradient.addColorStop(1, '#000000');

var staticDailyLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

let annotationLine = null;
let thresholdValue;


function getCurrentTimeRange() {
    const now = new Date();
    now.setSeconds(0, 0); // clear seconds & milliseconds
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const next = new Date(now.getTime() + 60 * 1000); // add 1 minute
    const nextTime = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;

    return { minTime: currentTime, maxTime: nextTime };
}


function updateGraph_temp_r_y_b(labels, temp1, temp2, temp3, temp4, temp5, temp6, temp7, temp8, temp9, temp10) {
    temp1 = Array.isArray(temp1) ? temp1 : [];
    temp2 = Array.isArray(temp2) ? temp2 : [];
    temp3 = Array.isArray(temp3) ? temp3 : [];
    temp4 = Array.isArray(temp4) ? temp4 : [];
    temp5 = Array.isArray(temp5) ? temp5 : [];
    temp6 = Array.isArray(temp6) ? temp6 : [];
    temp7 = Array.isArray(temp7) ? temp7 : [];
    temp8 = Array.isArray(temp8) ? temp8 : [];
    temp9 = Array.isArray(temp9) ? temp9 : [];
    temp10 = Array.isArray(temp10) ? temp10 : [];

    if (chart_temp_r_y_b) chart_temp_r_y_b.destroy();

    const isTemperatureDataEmpty = temp1.length === 0 && temp2.length === 0 && temp3.length === 0 && temp4.length === 0;

    const now = new Date();

    var min, max;

    // Ensure the min and max values are formatted correctly for mobile
    if (stepSeconds < 60) {
        min = `${String(now.getHours()).padStart(2, '0')}:00:00`;
        max = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00:00`;

    } else {
        min = `${String(now.getHours()).padStart(2, '0')}:00`;
        max = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`;
    }

    // min = `${String(now.getHours()).padStart(2, '0')}:00`;
    // max = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`;


    if (temp1.length !== labels.length) temp1 = new Array(labels.length).fill(0);
    if (temp2.length !== labels.length) temp2 = new Array(labels.length).fill(0);
    if (temp3.length !== labels.length) temp3 = new Array(labels.length).fill(0);
    if (temp4.length !== labels.length) temp4 = new Array(labels.length).fill(0);

    if (temp5.length !== labels.length) temp5 = new Array(labels.length).fill(0);
    if (temp6.length !== labels.length) temp6 = new Array(labels.length).fill(0);
    if (temp7.length !== labels.length) temp7 = new Array(labels.length).fill(0);
    if (temp8.length !== labels.length) temp8 = new Array(labels.length).fill(0);
    if (temp9.length !== labels.length) temp9 = new Array(labels.length).fill(0);
    if (temp10.length !== labels.length) temp10 = new Array(labels.length).fill(0);

    // ? PANEL SELECTION
    let selectedPanel = document.getElementById("controlPanelSelect_temp_r_y_b").value;
    console.log("Selected Panel:", selectedPanel);
    let datasets = [];

    // ? ALL
    if (selectedPanel === "all") {
        datasets = [
            { label: 'Temperature (R1)', data: temp1, backgroundColor: redGradient, borderColor: redGradient, borderWidth: 1 },
            { label: 'Temperature (Y1)', data: temp2, backgroundColor: yellowGradient, borderColor: yellowGradient, borderWidth: 1 },
            { label: 'Temperature (B1)', data: temp3, backgroundColor: blueGradient, borderColor: blueGradient, borderWidth: 1 },
            { label: 'Temperature (R2)', data: temp4, backgroundColor: pinkGradient, borderColor: pinkGradient, borderWidth: 1 },
            { label: 'Temperature (Y2)', data: temp5, backgroundColor: orangeGradient, borderColor: orangeGradient, borderWidth: 1 },
            { label: 'Temperature (B2)', data: temp6, backgroundColor: lightblueGradient, borderColor: lightblueGradient, borderWidth: 1 },
            { label: 'Temperature (R3)', data: temp7, backgroundColor: violetGradient, borderColor: violetGradient, borderWidth: 1 },
            { label: 'Temperature (Y3)', data: temp8, backgroundColor: lemonGradient, borderColor: lemonGradient, borderWidth: 1 },
            { label: 'Temperature (B3)', data: temp9, backgroundColor: darkblueGradient, borderColor: darkblueGradient, borderWidth: 1 }
        ];
    }
    // ? PANEL 1 (Control Panel 1)
    else if (selectedPanel.includes("1") || selectedPanel.includes("Control Panel 1")) {
        datasets = [
            { label: 'Temperature (R1)', data: temp1, backgroundColor: redGradient, borderColor: redGradient, borderWidth: 1 },
            { label: 'Temperature (Y1)', data: temp2, backgroundColor: yellowGradient, borderColor: yellowGradient, borderWidth: 1 },
            { label: 'Temperature (B1)', data: temp3, backgroundColor: blueGradient, borderColor: blueGradient, borderWidth: 1 }
        ];
    }
    // ? PANEL 2 (Control Panel 2)
    else if (selectedPanel.includes("2") || selectedPanel.includes("Control Panel 2")) {
        datasets = [
            { label: 'Temperature (R2)', data: temp4, backgroundColor: pinkGradient, borderColor: pinkGradient, borderWidth: 1 },
            { label: 'Temperature (Y2)', data: temp5, backgroundColor: orangeGradient, borderColor: orangeGradient, borderWidth: 1 },
            { label: 'Temperature (B2)', data: temp6, backgroundColor: lightblueGradient, borderColor: lightblueGradient, borderWidth: 1 }
        ];
    }
    // ? PANEL 3 (Control Panel 3)
    else if (selectedPanel.includes("3") || selectedPanel.includes("Control Panel 3")) {
        datasets = [
            { label: 'Temperature (R3)', data: temp7, backgroundColor: violetGradient, borderColor: violetGradient, borderWidth: 1 },
            { label: 'Temperature (Y3)', data: temp8, backgroundColor: lemonGradient, borderColor: lemonGradient, borderWidth: 1 },
            { label: 'Temperature (B3)', data: temp9, backgroundColor: darkblueGradient, borderColor: darkblueGradient, borderWidth: 1 }
        ];
    }

    // ? NEUTRAL ONLY FOR ALL
    if (NeutralAvailable === 1 && selectedPanel === "all") {
        datasets.push({
            label: 'Temperature (N)',
            data: temp10,
            backgroundColor: blackGradient,
            borderColor: blackGradient,
            borderWidth: 1
        });
    }

    // ? THRESHOLD ALWAYS
    datasets.push({
        label: 'Threshold',
        data: thresholdValue,
        backgroundColor: '#A9A9A9',
        borderColor: '#A9A9A9',
        borderWidth: 1
    });

    // ? YE IMPORTANT HAI - Ab datasets ko use karenge jo upar define kiya hai
    chart_temp_r_y_b = new Chart(ctx_temp_r_y_b, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        autoSkip: true
                    },
                    // min: min,
                    // max: max
                },
                y: {
                    title: {
                        display: true,
                        text: `Temperature (\u00B0C)`
                    },
                    min: 0,
                }
            },
            plugins: {
                legend: {
                    display: true,
                },
                annotation: {
                    annotations: thresholdValue ? [{
                        id: 'threshold',
                        type: 'line',
                        yMin: thresholdValue,
                        yMax: thresholdValue,
                        borderColor: '#D3D0C9',
                        borderWidth: 5,
                        borderDashOffset: 0,
                        label: {
                            display: false
                        }
                    }] : []
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy', // Panning for both axes (x and y)
                    },
                    zoom: {
                        wheel: {
                            enabled: true // Zooming with mouse wheel
                        },
                        pinch: {
                            enabled: true // Zooming with pinch-to-zoom gesture on mobile
                        },
                        mode: "xy", // Enable zooming in both directions (x and y)
                    },
                    limits: {
                        y: { min: 0 }, // Ensuring the y-axis doesn't go below zero
                    }
                }
            }
        }
    });
}





document.getElementById('timeframeSelect_temp_r_y_b').addEventListener('change', function () {
    var selectedValue = this.value;
    console.log('Selected timeframe:', selectedValue);
    var dateRangeContainer = document.getElementById('dateRangeContainer_temp_r_y_b');
    var daterange_start = document.getElementById('startDateDisplay_temp_r_y_b');
    var daterange_end = document.getElementById('endDateDisplay_temp_r_y_b');
    // var graphControl = document.getElementById('controlPanelSelect_temp_r_y_b').value;

    array_define = 0;

    if (array_define === 0) {
        temp1 = Array(totalPoints).fill(null);
        temp2 = Array(totalPoints).fill(null);
        temp3 = Array(totalPoints).fill(null);
        temp4 = Array(totalPoints).fill(null);
    }
    if (selectedValue === 'set-date') {
        isSetDateActive_temp_r_y_b = true;
        dateRangeContainer.style.display = 'block';
        daterange_start.style.display = 'block';
        daterange_end.style.display = 'block';
    } else if (selectedValue === 'daily') {
        isSetDateActive_temp_r_y_b = false;
        dateRangeContainer.style.display = 'none';
        daterange_start.style.display = 'none';
        daterange_end.style.display = 'none';

        let today = new Date();
        let formattedTodayDate = formatDateToYYYYMMDD(today);

        emitTemperatureData({ startDate: formattedTodayDate, endDate: formattedTodayDate, timeSelect: 'daily', controlGraph: graphControl });

    } else {
        isSetDateActive_temp_r_y_b = false;
        dateRangeContainer.style.display = 'none';
        console.log('Other selection made. No action taken.');
    }
});

document.getElementById('applyDateRange_temp_r_y_b').addEventListener('click', function () {
    if (isSetDateActive_temp_r_y_b) {
        var dateRangeInput = document.getElementById('dateRange_temp_r_y_b').value;
        console.log('Date Range Input:', dateRangeInput);
        var [startDate, endDate] = dateRangeInput.split(' to ').map(dateStr => {
            var [day, month, year] = dateStr.split('/');
            return new Date(year, month - 1, day);
        });
        var currentTimeSelect = document.getElementById('timeframeSelect_temp_r_y_b').value;

        // var graphControl = document.getElementById('controlPanelSelect_temp_r_y_b').value;

        if (currentTimeSelect === 'daily') {
            let today = new Date();
            let formattedTodayDate = formatDateToYYYYMMDD(today);

            emitTemperatureData({ startDate: formattedStartDate, endDate: formattedTodayDate, timeSelect: 'daily', controlGraph: graphControl });
        } else {
            var dateRangePicker = document.getElementById('dateRange_temp_r_y_b')._flatpickr;
            var selectedStartDate = dateRangePicker.selectedDates[0];
            var selectedEndDate = dateRangePicker.selectedDates[0];

            var formattedStartDate = formatDateToYYYYMMDD(selectedStartDate);
            var formattedEndDate = formatDateToYYYYMMDD(selectedEndDate);
            console.log('selectedStartDate_temp_r_y_b', formattedStartDate, formattedEndDate)

            emitTemperatureData({ startDate: formattedStartDate, endDate: formattedEndDate, timeSelect: 'set-date', controlGraph: graphControl });

        }

    }
});

document.getElementById('controlPanelSelect_temp_r_y_b').addEventListener('change', function () {
    var currentTimeSelect = document.getElementById('timeframeSelect_temp_r_y_b').value;
    var graphControl = document.getElementById('controlPanelSelect_temp_r_y_b').value;

    if (currentTimeSelect === 'daily') {
        let today = new Date();
        console.log('today', today)
        let formattedTodayDate = formatDateToYYYYMMDD(today);
        array_define = 0

        emitTemperatureData({ startDate: formattedTodayDate, endDate: formattedTodayDate, timeSelect: 'daily', controlGraph: graphControl });
    } else {
        var dateRangePicker = document.getElementById('dateRange_temp_r_y_b')._flatpickr;
        var selectedStartDate = dateRangePicker.selectedDates[0];
        var selectedEndDate = dateRangePicker.selectedDates[0];
        var formattedStartDate = formatDateToYYYYMMDD(selectedStartDate);
        var formattedEndDate = formatDateToYYYYMMDD(selectedEndDate);
        console.log('selectedStartDate_temp_r_y_b', formattedStartDate, formattedEndDate)
        array_define = 0

        emitTemperatureData({ startDate: formattedStartDate, endDate: formattedEndDate, timeSelect: 'set-date', controlGraph: graphControl });
    }
});

function emitTemperatureData(data) {
    var url = new URL(window.location.href);
    var pathname = url.pathname;
    var device_id = pathname.split('/').pop();
    const finalData = {
        startDate: data.startDate,
        endDate: data.endDate,
        timeSelect: data.timeSelect,
        controlGraph: data.controlGraph,
        device_id: device_id,
        email: user_email
    };

    console.log("device_id---------------", device_id, finalData)

    if (socket) {
        console.log("sending data")
        try {
            socket.emit('temperature_graph_data', finalData, (ack) => {
                console.log("? Data sent successfully, server ack:", ack);
            });
            console.log("?? Emit call made for temperature_graph_data");
        } catch (error) {
            console.error("? Error emitting temperature_graph_data:", error);
        }

    }
}


const timeframeSelect = document.getElementById('timeframeSelect_temp_r_y_b');



