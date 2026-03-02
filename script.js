// Configuration
const GITHUB_OWNER = 'shweta-patki';
const GITHUB_REPO = 'shweta-patki.github.io';
const WORKFLOW_NAME = 'footprints.yml';
const CSV_FILE = 'footprints.csv';

const RATE_LIMIT_KEY = 'footprint_last_click_';

/**
 * Get visitor's IP address
 */
async function getVisitorIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to fetch IP:', error);
        return null;
    }
}

/**
 * Get visitor's location based on IP
 */
async function getLocationByIP(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            city: data.city || 'Unknown',
            country: data.country_name || 'Unknown'
        };
    } catch (error) {
        console.error('Failed to fetch location:', error);
        return { city: 'Unknown', country: 'Unknown' };
    }
}

/**
 * Check if user has already clicked today (rate limiting)
 * Uses sessionStorage so limit persists for the session
 */
function hasClickedToday(ip) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = RATE_LIMIT_KEY + ip + '_' + today;
    return sessionStorage.getItem(key) !== null;
}

/**
 * Mark that user has clicked today
 */
function markClickedToday(ip) {
    const today = new Date().toISOString().split('T')[0];
    const key = RATE_LIMIT_KEY + ip + '_' + today;
    sessionStorage.setItem(key, 'true');
}

/**
 * Format date for display (YYYY-MM-DD)
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Get current CSV content from GitHub (public read)
 */
async function getCSVContent() {
    try {
        const response = await fetch(
            `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${CSV_FILE}`
        );
        if (response.ok) {
            return await response.text();
        }
        return 'id,datetime,city,country,ip\n';
    } catch (error) {
        console.error('Failed to fetch CSV:', error);
        return 'id,datetime,city,country,ip\n';
    }
}

/**
 * Trigger GitHub Actions workflow to save footprint
 */
async function saveFootprintToGitHub(ip, city, country, datetime) {
    try {
        // Use GitHub token from environment (set via GitHub Actions or build process)
        const token = process.env.GITHUB_TOKEN;
        
        if (!token) {
            console.error('GitHub token not available');
            return false;
        }
        
        // Trigger workflow dispatch
        const workflowResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_NAME}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: {
                        ip: ip,
                        city: city,
                        country: country,
                        datetime: datetime
                    }
                })
            }
        );
        
        if (!workflowResponse.ok) {
            console.error('Workflow dispatch failed:', workflowResponse.status, workflowResponse.statusText);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to save footprint:', error);
        return false;
    }
}

/**
 * Display footprints from GitHub CSV (public read, no auth needed)
 */
async function displayFootprints() {
    try {
        const csvContent = await getCSVContent();
        const lines = csvContent.trim().split('\n');
        const container = document.getElementById('footprints');
        container.innerHTML = '';
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 4) {
                const datetime = parts[1];
                const city = parts[2];
                const country = parts[3];
                
                // Extract date only (YYYY-MM-DD from ISO datetime)
                const date = datetime.split('T')[0];
                
                const p = document.createElement('p');
                p.textContent = `🐾 ${date} • ${city}, ${country}`;
                container.appendChild(p);
            }
        }
    } catch (error) {
        console.error('Failed to display footprints:', error);
    }
}

/**
 * Main function to handle footprint click
 */
async function addFootprint() {
    const button = document.getElementById('footclick');
    const originalHTML = button.innerHTML;
    
    try {
        // Disable button during processing
        button.disabled = true;
        button.style.opacity = '0.6';
        button.innerHTML = '⏳';
        
        // Get IP address
        const ip = await getVisitorIP();
        if (!ip) {
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.opacity = '1';
            alert('Unable to determine your IP address. Please try again.');
            return;
        }
        
        // Check rate limit
        if (hasClickedToday(ip)) {
            button.innerHTML = '✓';
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
                button.style.opacity = '1';
            }, 2000);
            alert('You have already left a footprint today! Come back tomorrow.');
            return;
        }
        
        // Get location
        const location = await getLocationByIP(ip);
        const datetime = new Date().toISOString();
        
        // Save to GitHub
        const success = await saveFootprintToGitHub(ip, location.city, location.country, datetime);
        
        if (!success) {
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.opacity = '1';
            alert('Failed to save footprint. Please check the console for details.');
            return;
        }
        
        // Mark as clicked today
        markClickedToday(ip);
        
        // Show success
        button.innerHTML = '✓';
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.opacity = '1';
        }, 2000);
        
        // Update display
        displayFootprints();
        
    } catch (error) {
        console.error('Error adding footprint:', error);
        button.innerHTML = originalHTML;
        button.disabled = false;
        button.style.opacity = '1';
        alert('An error occurred. Please try again.');
    }
}

// Load and display footprints on page load
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('footclick');
    if (button) {
        button.addEventListener('click', addFootprint);
    }
    displayFootprints();
});
