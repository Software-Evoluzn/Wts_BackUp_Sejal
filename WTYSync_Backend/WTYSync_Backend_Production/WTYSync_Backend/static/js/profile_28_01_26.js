document.addEventListener('DOMContentLoaded', function () {
    const deleteIcons = document.querySelectorAll('.delete_img');
    const fileInput = document.getElementById('fileUpload');
    const profileImg = document.getElementById('profileImg');

    /* CLICK PROFILE IMAGE → OPEN FILE SELECT */
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