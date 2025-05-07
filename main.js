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
    // Diámetros de los agujeros
    const HOLE_DIAMETER = 3.5;        // mm (agujeros del patrón)
    const FIXED_HOLE_DIAMETER = 3;    // mm (agujeros fijos 0 y 25)
    
    // Espacios edge-to-edge (definidos por el usuario)
    const SPACING_EDGE_TO_EDGE = 1;   // 1 mm entre agujeros del patrón
    const SPACING_FIXED_EDGE = 2;     // 2 mm entre patrón y fijos
    
    // Cálculo de distancias entre centros
    const SPACING = SPACING_EDGE_TO_EDGE + HOLE_DIAMETER;             // 4.5 mm
    const SPACING_FIXED_HOLE = (HOLE_DIAMETER/2 + FIXED_HOLE_DIAMETER/2) + SPACING_FIXED_EDGE; // 5.25 mm
    
    // Margen y dimensiones
    const MARGIN = 13,5;                // mm
    const numCols = machineStitches;  // 24
    const totalCols = numCols + 2;    // 24 + 2 fijos = 26

    // Cálculo del ancho total
    const spacesBetweenPattern = (numCols - 1) * SPACING;       // (24-1)*4.5 = 103.5 mm
    const spacesToFixedHoles = 2 * SPACING_FIXED_HOLE;          // 2*5.25 = 10.5 mm
    const width = spacesBetweenPattern + spacesToFixedHoles + 2 * MARGIN; // 103.5 + 10.5 + 24 = 138 mm

    // ... (resto del código)
}
    const height = (numRows - 1) * (SPACING + 1) + 2 * MARGIN; //TODO: Cambiar este +1
    
    let svg = [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `width="${width}mm" height="${height}mm"`,
        `viewBox="0 0 ${width} ${height}">`,
        // Add border rectangle
        `<rect x="0" y="0" width="${width}" height="${height}"`,
        `style="fill:none;stroke:black;stroke-width:0.2"/>`
    ].join('\n');

    pattern.forEach((row, rowIdx) => {
        // Add holes for this row
        for(let colIdx = -1; colIdx <= numCols; colIdx++) {
            const cx = MARGIN + (colIdx + 1) * SPACING;
            const cy = MARGIN + rowIdx * (SPACING +1); // TODO: Cambiar este +1
            
            if(colIdx === -1 || colIdx === numCols) {
                // Fixed position holes (0 and 25)
                svg += [
                    `<circle cx="${cx}" cy="${cy}"`,
                    `r="${FIXED_HOLE_DIAMETER/2}"`,
                    `stroke="black" stroke-width="0.2" fill="none"/>`
                ].join(' ');
            } else if(colIdx < row.length) {
                // Pattern holes (X marks)
                if(row[colIdx].toUpperCase() === 'X') {
                    svg += [
                        `<circle cx="${cx}" cy="${cy}"`,
                        `r="${HOLE_DIAMETER/2}"`,
                        `stroke="black" stroke-width="0.2" fill="none"/>`
                    ].join(' ');
                }
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
