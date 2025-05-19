let currentPattern = null;

function showMessage(message, type = 'success') {
    const flashDiv = document.getElementById('flash-messages');
    const msgElement = document.createElement('div');
    msgElement.className = `flash-message ${type}`;
    msgElement.textContent = message;
    msgElement.onclick = () => msgElement.remove();
    flashDiv.appendChild(msgElement);
}

function processImage(file, stitchCount, threshold, invert) {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate proportional height
            const newHeight = Math.round((stitchCount / img.width) * img.height);
            canvas.width = stitchCount;
            canvas.height = newHeight;
            
            // Draw and convert to grayscale
            ctx.drawImage(img, 0, 0, stitchCount, newHeight);
            const imageData = ctx.getImageData(0, 0, stitchCount, newHeight);
            
            // Generate pattern
            const pattern = [];
            for(let y = 0; y < newHeight; y++) {
                let row = '';
                for(let x = 0; x < stitchCount; x++) {
                    const i = (y * stitchCount + x) * 4;
                    const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
                    const isMarked = invert ? avg > threshold : avg < threshold;
                    row += isMarked ? 'X' : '-';
                }
                pattern.push(row);
            }
            
            currentPattern = pattern;
            displayResults(pattern, stitchCount, newHeight, threshold, invert);
            showMessage('Conversion successful!');
        };
        img.src = e.target.result;
    };
    
    reader.onerror = () => showMessage('Error reading file', 'error');
    reader.readAsDataURL(file);
}

function displayResults(pattern, stitchCount, rows, threshold, invert) {
    document.getElementById('resultsSection').style.display = 'block';
    
    // Update settings
    const settingsList = document.getElementById('patternSettings');
    settingsList.innerHTML = `
        <li><strong>Stitch Count:</strong> ${stitchCount}</li>
        <li><strong>Threshold:</strong> ${threshold}</li>
        <li><strong>Invert:</strong> ${invert ? 'Yes' : 'No'}</li>
        <li><strong>Pattern Size:</strong> ${stitchCount}×${rows}</li>
    `;

    // Display pattern
    const container = document.getElementById('patternContainer');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    pattern.forEach(row => {
        const tr = document.createElement('tr');
        row.split('').forEach(cell => {
            const td = document.createElement('td');
            td.className = cell === 'X' ? 'filled' : 'empty';
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    container.appendChild(table);
}

function generateSVG(pattern, machineStitches = 24) {
    // Diámetros 
    const HOLE_DIAMETER = 2.999;
    const FIXED_HOLE_DIAMETER = 2.611;

    // Configuración
    const SPACING = 4.32;
    const SPACING_FIXED_HOLE_LEFT = 5.63;
    const SPACING_FIXED_HOLE_RIGHT = 7.18;
    const MARGIN = 13.86;
    const ROW_SPACING = 4.76;

    const numCols = machineStitches;
    const numRows = pattern.length;

    // *** CORRECCIÓN 1: Definir width antes de usarlo en el SVG ***
    const width = MARGIN * 2 
                + SPACING_FIXED_HOLE_LEFT 
                + SPACING_FIXED_HOLE_RIGHT 
                + (numCols - 1) * SPACING;

    // *** CORRECCIÓN 2: Calcular altura incluyendo diámetros ***
    const maxHoleHeight = Math.max(HOLE_DIAMETER, FIXED_HOLE_DIAMETER);
    const height = (numRows - 1) * ROW_SPACING + maxHoleHeight + 2 * MARGIN;

    let svg = [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `width="${width}mm" height="${height}mm"`,
        `viewBox="0 0 ${width} ${height}">`,
        `<rect x="0" y="0" width="${width}" height="${height}"`,
        `fill="none" stroke="black" stroke-width="0.2"/>`
    ].join('\n');

    pattern.forEach((row, rowIdx) => {
        // *** CORRECCIÓN 3: Alineación vertical precisa ***
        const topReference = MARGIN + rowIdx * ROW_SPACING;
        const fixedCy = topReference + FIXED_HOLE_DIAMETER/2;
        const patternCy = topReference + HOLE_DIAMETER/2;

        // Agujero fijo izquierdo
        svg += `
            <circle cx="${MARGIN}" cy="${fixedCy}" 
                r="${FIXED_HOLE_DIAMETER/2}" 
                fill="none" stroke="black" stroke-width="0.2"/>`;

        // Agujero fijo derecho
        const rightX = MARGIN 
                     + SPACING_FIXED_HOLE_LEFT 
                     + (numCols - 1) * SPACING 
                     + SPACING_FIXED_HOLE_RIGHT;
        svg += `
            <circle cx="${rightX}" cy="${fixedCy}" 
                r="${FIXED_HOLE_DIAMETER/2}" 
                fill="none" stroke="black" stroke-width="0.2"/>`;

        // Agujeros del patrón
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
            if (row[colIdx] === 'X') {
                const cx = MARGIN 
                         + SPACING_FIXED_HOLE_LEFT 
                         + colIdx * SPACING;
                svg += `
                    <circle cx="${cx}" cy="${patternCy}" 
                        r="${HOLE_DIAMETER/2}" 
                        fill="none" stroke="black" stroke-width="0.2"/>`;
            }
        }
    });

    svg += '</svg>';
    return svg;
}
function downloadSVG() {
    if(!currentPattern) return;
    
    try {
        const svg = generateSVG(currentPattern);
        const blob = new Blob([svg], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pattern.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        showMessage(`Error generating SVG: ${error.message}`, 'error');
    }
}

function downloadText() {
    if(!currentPattern) return;
    const text = currentPattern.join('\n');
    const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('threshold').addEventListener('input', function() {
        document.getElementById('threshold_value').textContent = this.value;
    });

    document.getElementById('conversionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('image');
        if(!fileInput.files[0]) {
            showMessage('Please select an image file', 'error');
            return;
        }

        const stitchCount = parseInt(document.getElementById('stitch_count').value);
        const threshold = parseInt(document.getElementById('threshold').value);
        const invert = document.getElementById('invert').checked;

        if(stitchCount < 1 || stitchCount > 100) {
            showMessage('Stitch count must be between 1-100', 'error');
            return;
        }

        processImage(fileInput.files[0], stitchCount, threshold, invert);
    });
});
