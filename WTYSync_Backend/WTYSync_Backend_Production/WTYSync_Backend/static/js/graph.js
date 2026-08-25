fetch('static/js/ip.json')
    .then(response => response.json())
    .then(data => {
        const serverIP = data.ip;
        console.log("Fetched IP:", serverIP);

        // Connect to Socket.IO server dynamically
        var socket = io.connect(serverIP);

        socket.on('connect', function () {
            console.log("Connected to server");
            const email = localStorage.getItem("email"); // Or from wherever you store the email
            if (email) {
                socket.emit("user_connected", { email });  // Send to backend
            }
        });

        socket.on('update_temperature', function (data) {
            console.log("Received updated data:", data);

            const finalData = data.final_data;
            const result = data.result;


            for (let deviceId in finalData) {
                const panels = finalData[deviceId];

                for (let panelName in panels) {
                    const sensors = panels[panelName];

                    function sanitizeId(str) {
                        return str.trim().replace(/\s+/g, '_');
                    }

                    const dataId = `${sanitizeId(deviceId)}_${sanitizeId(panelName)}`;

                    const panelInput = document.querySelector(`input.control_panel_edit[data-id="${dataId}"]`);

                    if (!panelInput) {
                        continue;
                    }

                    // Traverse up to the container that holds the sensor blocks
                    const panelContainer = panelInput.closest('.pt-3'); // <div class="pt-3"> containing sensors
                    if (!panelContainer) {
                        continue;
                    }

                    // Find all sensor value divs inside this container
                    const sensorBlocks = panelContainer.querySelectorAll('.dashboard_temp_sensor_indv_div');

                    sensorBlocks.forEach(block => {
                        const sensorTitle = block.querySelector('.dashboard_temp_sensor_indv_div_T1 span');
                        const sensorValueDiv = block.querySelector('.dashboard_temp_avg_value_div');

                        if (!sensorTitle || !sensorValueDiv) return;

                        const sensorName = sensorTitle.innerText.trim();
                        const newValue = sensors[sensorName];

                        if (newValue !== undefined) {
                            if (newValue === null) {
                                sensorValueDiv.innerText = `-°C`;
                            } else{
                                sensorValueDiv.innerText = `${newValue}°C`;
                            }
                        }
                    });
                }
            }

            for (let deviceName in result) {
                const deviceData = result[deviceName];

                // Loop through each sensor for the device
                for (let sensorName in deviceData) {
                    const sensorData = deviceData[sensorName];

                    // Grab the elements in the HTML by device and sensor
                    const minValueElement = document.querySelector(`.dashboard_temp_min_value_div[data-device="${deviceName}"][data-sensor="${sensorName}"]`);
                    const maxValueElement = document.querySelector(`.dashboard_temp_max_value_div[data-device="${deviceName}"][data-sensor="${sensorName}"]`);

                    // Set the MIN and MAX values (fallback to 'N/A' if undefined)
                    if (minValueElement) {
                        minValueElement.textContent = `${sensorData.MIN || '-'}°C`;
                    }
                    if (maxValueElement) {
                        maxValueElement.textContent = `${sensorData.MAX || '-'}°C`;
                    }
                }
            }

        });


    });

(error => console.error('Error fetching IP:', error));