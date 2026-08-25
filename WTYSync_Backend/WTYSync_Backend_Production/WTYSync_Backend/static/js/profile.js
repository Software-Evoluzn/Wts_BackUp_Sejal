document.addEventListener('DOMContentLoaded', function () {
    const deleteIcons = document.querySelectorAll('.delete_img');
    const fileInput = document.getElementById('fileUpload');
    const profileImg = document.getElementById('profileImg');

    /* CLICK PROFILE IMAGE ? OPEN FILE SELECT */
    if (profileImg && fileInput) {
        profileImg.style.cursor = "pointer";
        profileImg.addEventListener("click", () => {
            fileInput.click();
        });
    }

    /* --------------------------
       PROFILE IMAGE UPLOAD
    --------------------------- */
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {

                // Preview image
                const reader = new FileReader();
                reader.onload = e => {
                    profileImg.src = e.target.result;
                };
                reader.readAsDataURL(fileInput.files[0]);

                document.getElementById('uploadForm').submit();
            }
        });
    }

    deleteIcons.forEach(icon => {
        icon.addEventListener('click', async function () {
            const deviceName = this.getAttribute('data-name');
            const row = this.closest('tr');

            if (confirm("Are you sure you want to delete this device?")) {
                try {
                    const response = await fetch(`/delete_device/${deviceName}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();
                    if (data.success) {
                        row.remove(); // Remove row from UI
                        window.location.reload(); // Reload the page to reflect changes
                    } else {
                        alert('Failed to delete: ' + (data.message || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the device.');
                }
            }
        });
    });

});


const deviceRows = document.querySelectorAll('.device-row');

const modal = new bootstrap.Modal(document.getElementById('deviceModal'));

const modalDeviceName = document.getElementById('modalDeviceName');
// const modalDeviceType = document.getElementById('modalDeviceType');
const modalDeviceUnit = document.getElementById('modalDeviceUnit');
// const modalTimestamp = document.getElementById('modalTimestamp');
const saveBtn = document.getElementById('saveDeviceUnit');

let selectedDeviceName = "";

/* ROW CLICK */
deviceRows.forEach(row => {

    row.addEventListener('click', function (e) {

        // Prevent opening modal when clicking delete icon
        if (e.target.classList.contains('delete_img')) return;

        const name = this.dataset.name;
        const unit = this.dataset.unit;

        selectedDeviceName = name;

        // Fill modal
        modalDeviceName.value = name;
        modalDeviceUnit.value = unit;

        // Open modal
        modal.show();
    });

});


/* SAVE DEVICE UNIT */
saveBtn.addEventListener('click', async () => {

    const newUnit = modalDeviceUnit.value.trim();

    if (!newUnit) {
        alert("Device unit cannot be empty");
        return;
    }

    try {

        const response = await fetch('/update_device_unit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_name: selectedDeviceName,
                device_unit: newUnit
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("Updated successfully!");
            location.reload();
        } else {
            alert(data.message || "Update failed");
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
    }

});
