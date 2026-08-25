document.addEventListener('DOMContentLoaded', function () {
    const deleteIcons = document.querySelectorAll('.delete_img');

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