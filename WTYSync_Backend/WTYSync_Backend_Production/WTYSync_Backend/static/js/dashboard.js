let globalPanelName = '';

document.addEventListener('DOMContentLoaded', function () {
  // Attach event listeners to both buttons (edit and apply)
  const editButton = document.querySelectorAll('.edit_name');
  const applyButton = document.querySelectorAll('.apply_name');
  const inputField = document.querySelectorAll('.control_panel_edit');

  // Event listener for edit button
  editButton.forEach((button, index) => {
    button.addEventListener('click', function () {
      const input = inputField[index];
      globalPanelName = input.value;

      console.log(this.id);

      console.log('Current value before editing (stored in global variable):', globalPanelName);
      input.removeAttribute('readonly');
      input.focus();
      input.style.border = "1px solid #000";

      applyButton[index].style.display = "inline-block";
    });
  });

  // Event listener for apply button
  applyButton.forEach((button, index) => {
    button.addEventListener('click', function () {
      // Get the associated input field value
      const input = inputField[index];
      const newPanelName = input.value; // Get the updated panel name

      // Send the updated panel name to the backend using fetch
      const data = {
        device_name: button.getAttribute('data-id').split('_')[1], // Extract device_name
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
});
