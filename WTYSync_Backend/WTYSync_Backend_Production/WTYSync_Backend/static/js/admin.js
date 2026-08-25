document.addEventListener('DOMContentLoaded', function () {
    // Select the form elements
    const form = document.getElementById('adminForm');
    const deviceInput = document.getElementById('device_name');
    const addButton = document.querySelector('.device_container button');
    const deviceContainer = document.querySelector('.device_container');
    const companyNameInput = document.getElementById('company_name'); // Select company name input
    const deviceTypeSelect = document.getElementById('device_type');
    const deviceduration = document.getElementById('device_duration');

    // Handle form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault();
    
        // Get the form values
        const companyName = companyNameInput.value;
        const deviceName = deviceInput.value;
        const deviceType = deviceTypeSelect.value;
        const deviceDuration = deviceduration.value;
    
        const deviceData = [];
    
        // Push the main input if exists
        if (deviceName.trim()) {
            deviceData.push({
                device_type: deviceType,
                device_name: deviceName.trim()
            });
        }
    
        // Collect dynamically added selects + inputs
        const addedDeviceDivs = deviceContainer.querySelectorAll('div.mt-2');
    
        addedDeviceDivs.forEach(deviceDiv => {
            const select = deviceDiv.querySelector('select');
            const input = deviceDiv.querySelector('input');
    
            if (select && input && input.value.trim()) {
                deviceData.push({
                    device_type: select.value,
                    device_name: input.value.trim()
                });
            }
        });
    
        console.log("Device Data:", deviceData);
    
        fetch('/add_admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                company_name: companyName,
                device_data: deviceData,
                device_duration: deviceDuration
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Successfully Added!!!");
                companyNameInput.value = '';
                deviceInput.value = '';
                deviceTypeSelect.selectedIndex = 0; // reset select
    
                const addedDeviceDivs = deviceContainer.querySelectorAll('div.mt-2');
                addedDeviceDivs.forEach(deviceDiv => {
                    if (deviceContainer.contains(deviceDiv)) {
                        deviceContainer.removeChild(deviceDiv);
                    }
                });
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred. Check console for details.");
        });
    });
    

    addButton.addEventListener('click', function (event) {
        event.preventDefault();
    
        const deviceName = deviceInput.value.trim();
        const deviceType = deviceTypeSelect.value;
    
        if (deviceName === '') {
            alert('Please enter a device name before adding.');
            return;
        }
    
        // Create container div for new device
        const newDeviceDiv = document.createElement('div');
        newDeviceDiv.classList.add('mt-2', 'd-flex', 'gap-2', 'align-items-end');
    
        // Create a select showing selected value (disabled)
        const newSelect = document.createElement('select');
        newSelect.classList.add('form-select', 'select_contain');
        newSelect.disabled = true;
    
        // Fill select with only one option (selected)
        const selectedOption = document.createElement('option');
        selectedOption.value = deviceType;
        selectedOption.textContent = deviceType;
        newSelect.appendChild(selectedOption);
    
        // Create disabled input
        const newDeviceInput = document.createElement('input');
        newDeviceInput.classList.add('form-control');
        newDeviceInput.type = 'text';
        newDeviceInput.value = deviceName;
        newDeviceInput.disabled = true;
    
        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('btn', 'btn-outline-danger', 'p-2', 'mb-3');
        removeButton.innerHTML = '<img src="/static/img/remove.svg" alt="Remove">';
    
        removeButton.addEventListener('click', function () {
            deviceContainer.removeChild(newDeviceDiv);
        });
    
        // Append select, input, and remove button
        newDeviceDiv.appendChild(newSelect);
        newDeviceDiv.appendChild(newDeviceInput);
        newDeviceDiv.appendChild(removeButton);
    
        // Add the div to container
        deviceContainer.appendChild(newDeviceDiv);
    
        // Clear the input field
        deviceInput.value = '';
    });
    

});
