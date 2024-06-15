window.onload = function () {
    var canvas = document.getElementById("paint-canvas");
    var context = canvas.getContext("2d");
    var svgFrame = document.getElementById("svg-frame");
    var svgItems = svgFrame.getElementsByClassName("svg-item");

    var startX = 0;
    var startY = 0;
    var mouseX = 0;
    var mouseY = 0;
    var isDrawing = false;
    var isErasing = false;
    var drawnLines = [];
    var drawnImages = [];
    var drawnTexts = [];
    var isImageDragging = false;
    var isMovingImage = false;
    var draggedImage = null;
    var prevX, prevY;

    var currentColor = '#ea3030';
    var currentLineWidth = 5;
    var currentTool = 'draw'; // Default tool is drawing

    var colors = document.getElementsByClassName('colors')[0];
    colors.addEventListener('click', function(event) {
        currentColor = event.target.getAttribute('value') || 'black';
    });

    var brushes = document.getElementsByClassName('brushes')[0];
    brushes.addEventListener('click', function(event) {
        currentLineWidth = parseInt(event.target.getAttribute('value'), 10) || 1;
    });

    var tools = document.getElementsByClassName('tools')[0];
    tools.addEventListener('click', function(event) {
        var toolValue = event.target.getAttribute('value');
        if (toolValue === 'erase') {
            isErasing = true;
            currentTool = toolValue || 'draw';
        } else {
            isErasing = false;
            currentTool = toolValue || 'draw';
        }
    });
    
    function eraseAt(x, y) {
        // Erase lines
        drawnLines = drawnLines.filter(function(line) {
            return !isPointNearLine(x, y, line.x1, line.y1, line.x2, line.y2, currentLineWidth);
        });
    
        // Erase images
        drawnImages = drawnImages.filter(function(image) {
            return !isPointInRect(x, y, image.x, image.y, image.width, image.height);
        });
    
        // Erase text (not implemented in original code)
        // You can choose how to handle erasing text, e.g., by clicking on it or by region
        drawnTexts = drawnTexts.filter(function(text) {
            return !isPointInRect(text.text, text.x, text.y);
        });
    
        redrawCanvas();
    }
    
    // Helper functions for collision detection
    function isPointNearLine(px, py, x1, y1, x2, y2, tolerance) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var length = Math.sqrt(dx * dx + dy * dy);
        var u = ((px - x1) * dx + (py - y1) * dy) / (length * length);
        var nearestX, nearestY;
    
        if (u < 0) {
            nearestX = x1;
            nearestY = y1;
        } else if (u > 1) {
            nearestX = x2;
            nearestY = y2;
        } else {
            nearestX = x1 + u * dx;
            nearestY = y1 + u * dy;
        }
    
        var distance = Math.sqrt((px - nearestX) * (px - nearestX) + (py - nearestY) * (py - nearestY));
        return distance <= tolerance;
    }
    
    function isPointInRect(px, py, x, y, width, height) {
        return px >= x && px <= x + width && py >= y && py <= y + height;
    }
    

    function drawGrid() {
        context.strokeStyle = '#ddd';
        context.lineWidth = 0.5;
        context.beginPath();

        for (let x = 0.5; x < canvas.width; x += 20) {
            context.moveTo(x, 0);
            context.lineTo(x, canvas.height);
        }

        for (let y = 0.5; y < canvas.height; y += 20) {
            context.moveTo(0, y);
            context.lineTo(canvas.width, y);
        }

        context.stroke();
        context.closePath();
    }

    function snapToGrid(coord) {
        return Math.round(coord / 20) * 20;
    }

    function updateBoundings() {
        boundings = canvas.getBoundingClientRect();
    }

    function setMouseCoordinates(event) {
        var clientX, clientY;
        if (event.touches) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        mouseX = clientX - boundings.left;
        mouseY = clientY - boundings.top;
    }

    function startDrawing(event) {
        event.preventDefault();
        setMouseCoordinates(event);
        if (isImageDragging) return; // Do nothing if an image is being dragged

        if (currentTool === 'draw') {
            startX = snapToGrid(mouseX);
            startY = snapToGrid(mouseY);
            isDrawing = true;
        } else if (currentTool === 'move') {
            var x = mouseX;
            var y = mouseY;

            // Check if an image is clicked for moving
            drawnImages.forEach(function(image, index) {
                if (x >= image.x && x <= image.x + image.width && y >= image.y && y <= image.y + image.height) {
                    isMovingImage = true;
                    draggedImage = index;
                    prevX = x;
                    prevY = y;
                    return;
                }
            });
        } else if (currentTool === 'text') {
            var text = prompt('Enter text:');
            if (text) {
                var x = snapToGrid(mouseX);
                var y = snapToGrid(mouseY);
                context.font = "20px Arial";
                drawnTexts.push({ x: x, y: y, text: text, color: currentColor });
                redrawCanvas();
            }
        }
    }

    function draw(event) {
        event.preventDefault();
        setMouseCoordinates(event);
        if (isErasing) {
            eraseAt(mouseX, mouseY);
        } else if (isDrawing) {
            redrawCanvas();
            drawLine(startX, startY, snapToGrid(mouseX), snapToGrid(mouseY), currentColor, currentLineWidth, false);
        } else if (isMovingImage && draggedImage !== null) {
            var x = mouseX;
            var y = mouseY;

            var dx = x - prevX;
            var dy = y - prevY;

            prevX = x;
            prevY = y;

            drawnImages[draggedImage].x += dx;
            drawnImages[draggedImage].y += dy;

            // Snap the image to the grid
            drawnImages[draggedImage].x = snapToGrid(drawnImages[draggedImage].x);
            drawnImages[draggedImage].y = snapToGrid(drawnImages[draggedImage].y);

            redrawCanvas();
        }
    }

    function endDrawing(event) {
        if (isDrawing) {
            setMouseCoordinates(event);
            const endX = snapToGrid(mouseX);
            const endY = snapToGrid(mouseY);
            drawLine(startX, startY, endX, endY, currentColor, currentLineWidth, true);
            drawnLines.push({ x1: startX, y1: startY, x2: endX, y2: endY, color: currentColor, width: currentLineWidth });
            isDrawing = false;
            redrawCanvas();
        } else if (isMovingImage) {
            isMovingImage = false;
            draggedImage = null;
        }
    }

    function drawLine(x1, y1, x2, y2, color, width, permanent) {
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
    }

    function redrawCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height);

        drawGrid();
        drawnLines.forEach(line => {
            drawLine(line.x1, line.y1, line.x2, line.y2, line.color, line.width, true);
        });
        drawnImages.forEach(image => {
            drawImageOnCanvas(image);
        });
        drawnTexts.forEach(text => {
            context.fillStyle = text.color;
            context.fillText(text.text, text.x, text.y);
        });
    }

    // Move the image drawing to a separate function
    function drawImageOnCanvas(image) {
        var img = new Image();
        img.onload = function() {
            context.drawImage(img, image.x, image.y, image.width, image.height);
        }
        img.src = image.src;
    }

    // Modify the saveButton event listener to include drawing images before exporting
    var saveButton = document.getElementById('save');
    saveButton.addEventListener('click', function() {
        var imageName = prompt('Please enter image name');
        if (!imageName) {
            alert("Image name cannot be empty.");
            return;
        }

        // Count the number of images that need to be loaded
        var imagesToLoad = drawnImages.length;
        var imagesLoaded = 0;

        // Function to check if all images have loaded
        function checkAllImagesLoaded() {
            if (imagesLoaded === imagesToLoad) {
                // Once all images are loaded, export the canvas
                var canvasDataURL = canvas.toDataURL();
                var a = document.createElement('a');
                a.href = canvasDataURL;
                a.download = imageName || 'drawing';
                a.click();
            }
        }

        redrawCanvas(); // Include drawing images

        // Check if there are no images to load
        if (imagesToLoad === 0) {
            checkAllImagesLoaded();
        } else {
            // Loop through each image and attach onload event listener
            drawnImages.forEach(function(image) {
                var img = new Image();
                img.onload = function() {
                    imagesLoaded++;
                    // Check if all images have loaded
                    checkAllImagesLoaded();
                }
                img.src = image.src;
            });
        }
    });

    var clearButton = document.getElementById('clear');
    clearButton.addEventListener('click', function() {
        drawnLines = [];
        drawnImages = [];
        drawnTexts = [];
        redrawCanvas();
    });

    var undoButton = document.getElementById('undo');
    undoButton.addEventListener('click', function() {
        if (drawnLines.length > 0) {
            drawnLines.pop();
        } else if (drawnImages.length > 0) {
            drawnImages.pop();
        } else if (drawnTexts.length > 0) {
            drawnTexts.pop();
        }
        redrawCanvas();
    });

    Array.from(svgItems).forEach(function(svgItem) {
        svgItem.addEventListener('dragstart', function(event) {
            isImageDragging = true;
            var imageUrl = event.target.getAttribute('src');
            event.dataTransfer.setData('image/png', imageUrl);
        });

        svgItem.addEventListener('touchstart', function(event) {
            isImageDragging = true;
            var imageUrl = event.target.getAttribute('src');
            var touch = event.touches[0];
            event.dataTransfer = {
                setData: function(format, data) {
                    this[format] = data;
                },
                getData: function(format) {
                    return this[format];
                },
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            event.dataTransfer.setData('image/png', imageUrl);
        });
    });

    // Function to remove 'active' class from all elements in a NodeList
function clearActive(elements) {
    Array.from(elements).forEach(function(element) {
        element.classList.remove('active');
    });
}

// Function to set 'active' class to the selected element
function setActive(element) {
    element.classList.add('active');
}

// Update event listeners to set and clear active states for buttons only
colors.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') {
        currentColor = event.target.getAttribute('value') || 'black';
        clearActive(colors.getElementsByTagName('button'));
        setActive(event.target);
    }
});

brushes.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') {
        currentLineWidth = parseInt(event.target.getAttribute('value'), 10) || 1;
        clearActive(brushes.getElementsByTagName('button'));
        setActive(event.target);
    }
});

tools.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') {
        currentTool = event.target.getAttribute('value') || 'draw';
        clearActive(tools.getElementsByTagName('button'));
        setActive(event.target);
    }
});



    canvas.addEventListener('drop', function(event) {
        event.preventDefault();
        setMouseCoordinates(event);
        isImageDragging = false;
        var imageUrl = event.dataTransfer.getData('image/png');

        if (imageUrl) {
            var image = new Image();
            image.src = imageUrl;
            image.onload = function() {
                var aspectRatio = image.height / image.width;
                var newWidth = 80; 
                console.log("Test");
                var newHeight = newWidth * aspectRatio;

                // Position the image where it was dropped
                var dropX = snapToGrid(mouseX);
                var dropY = snapToGrid(mouseY);

                context.drawImage(image, dropX, dropY, newWidth, newHeight);
                drawnImages.push({ x: dropX, y: dropY, width: newWidth, height: newHeight, src: imageUrl });
                redrawCanvas();
            };
        }
    });

    canvas.addEventListener('dragover', function(event) {
        event.preventDefault();
    });

    canvas.addEventListener('touchmove', function(event) {
        event.preventDefault();
    });

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', endDrawing);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDrawing);

    window.addEventListener('resize', updateBoundings);

    updateBoundings();
    redrawCanvas();
};
