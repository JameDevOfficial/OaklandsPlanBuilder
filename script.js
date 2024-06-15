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
    var drawnElements = []; // Store all elements in the order they are drawn
    var isImageDragging = false;
    var isMovingImage = false;
    var draggedImage = null;
    var prevX, prevY;

    var currentColor = '#ea3030';
    var currentLineWidth = 5;
    var currentTool = 'draw'; // Default tool is drawing

    var colors = document.getElementsByClassName('colors')[0];
    colors.addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON') {
            currentColor = event.target.getAttribute('value') || 'black';
            clearActive(colors.getElementsByTagName('button'));
            setActive(event.target);
        }
    });

    var brushes = document.getElementsByClassName('brushes')[0];
    brushes.addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON') {
            currentLineWidth = parseInt(event.target.getAttribute('value'), 10) || 1;
            clearActive(brushes.getElementsByTagName('button'));
            setActive(event.target);
        }
    });

    var tools = document.getElementsByClassName('tools')[0];
    tools.addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON') {
            currentTool = event.target.getAttribute('value') || 'draw';
            isErasing = currentTool === 'erase';
            clearActive(tools.getElementsByTagName('button'));
            setActive(event.target);
        }
    });

    function eraseAt(x, y) {
        drawnElements = drawnElements.filter(function(element) {
            if (element.type === 'line') {
                return !isPointNearLine(x, y, element.x1, element.y1, element.x2, element.y2, currentLineWidth);
            } else if (element.type === 'image') {
                return !isPointInRect(x, y, element.x, element.y, element.width, element.height);
            } else if (element.type === 'text') {
                return !isPointInRect(x, y, element.x, element.y, context.measureText(element.text).width, parseInt(context.font, 10));
            }
            return true;
        });

        redrawCanvas();
    }

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
        mouseX = clientX - boundings.left + window.scrollX;
        mouseY = clientY - boundings.top + window.scrollY;
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
            drawnElements.forEach(function(element, index) {
                if (element.type === 'image' && x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height) {
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
                drawnElements.push({ type: 'text', x: x, y: y, text: text, color: currentColor });
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

            drawnElements[draggedImage].x += dx;
            drawnElements[draggedImage].y += dy;
        }
    }

    function endDrawing(event) {
        if (isDrawing) {
            setMouseCoordinates(event);
            const endX = snapToGrid(mouseX);
            const endY = snapToGrid(mouseY);
            drawLine(startX, startY, endX, endY, currentColor, currentLineWidth, true);
            drawnElements.push({ type: 'line', x1: startX, y1: startY, x2: endX, y2: endY, color: currentColor, width: currentLineWidth });
            isDrawing = false;
            redrawCanvas();
        } else if (isMovingImage) {
            isMovingImage = false;
            draggedImage = null;
            redrawCanvas();
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
        drawnElements.forEach(element => {
            if (element.type === 'line') {
                drawLine(element.x1, element.y1, element.x2, element.y2, element.color, element.width, true);
            } else if (element.type === 'image') {
                drawImageOnCanvas(element);
            } else if (element.type === 'text') {
                context.fillStyle = element.color;
                context.fillText(element.text, element.x, element.y);
            }
        });
    }

    function drawImageOnCanvas(image) {
        var img = new Image();
        img.onload = function() {
            context.drawImage(img, image.x, image.y, image.width, image.height);
        }
        img.src = image.src;
    }

    var saveButton = document.getElementById('save');
    saveButton.addEventListener('click', function() {
        var imageName = prompt('Please enter image name');
        if (!imageName) {
            alert("Image name cannot be empty.");
            return;
        }

        var imagesToLoad = drawnElements.filter(el => el.type === 'image').length;
        var imagesLoaded = 0;

        function checkAllImagesLoaded() {
            if (imagesLoaded === imagesToLoad) {
                var canvasDataURL = canvas.toDataURL();
                var a = document.createElement('a');
                a.href = canvasDataURL;
                a.download = imageName || 'drawing';
                a.click();
            }
        }

        redrawCanvas(); // Include drawing images

        if (imagesToLoad === 0) {
            checkAllImagesLoaded();
        } else {
            drawnElements.forEach(function(element) {
                if (element.type === 'image') {
                    var img = new Image();
                    img.onload = function() {
                        imagesLoaded++;
                        checkAllImagesLoaded();
                    }
                    img.src = element.src;
                }
            });
        }
    });

    var clearButton = document.getElementById('clear');
    clearButton.addEventListener('click', function() {
        drawnElements = [];
        redrawCanvas();
    });

    var undoButton = document.getElementById('undo');
    undoButton.addEventListener('click', function() {
        if (drawnElements.length > 0) {
            drawnElements.pop();
            redrawCanvas();
        }
    });

    Array.from(svgItems).forEach(function(svgItem) {
        svgItem.addEventListener('dragstart', function(event) {
            isImageDragging = true;
            var imageUrl = event.target.getAttribute('src');
            var isTwice = event.target.classList.contains('twice');
            event.dataTransfer.setData('image/png', imageUrl);
            event.dataTransfer.setData('isTwice', isTwice);
        });

        svgItem.addEventListener('touchstart', function(event) {
            isImageDragging = true;
            var imageUrl = event.target.getAttribute('src');
            var isTwice = event.target.classList.contains('twice');
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
            event.dataTransfer.setData('isTwice', isTwice);
        });
    });

    function clearActive(elements) {
        Array.from(elements).forEach(function(element) {
            element.classList.remove('active');
        });
    }

    function setActive(element) {
        element.classList.add('active');
    }

    canvas.addEventListener('drop', function(event) {
        event.preventDefault();
        setMouseCoordinates(event);
        isImageDragging = false;
        var imageUrl = event.dataTransfer.getData('image/png');
        var isTwice = event.dataTransfer.getData('isTwice') === 'true';

        if (imageUrl) {
            var image = new Image();
            image.src = imageUrl;
            image.onload = function() {
                var aspectRatio = image.height / image.width;
                var newWidth = isTwice ? 160 : 80;
                var newHeight = newWidth * aspectRatio;

                var dropX = snapToGrid(mouseX);
                var dropY = snapToGrid(mouseY);

                context.drawImage(image, dropX, dropY, newWidth, newHeight);
                drawnElements.push({ type: 'image', x: dropX, y: dropY, width: newWidth, height: newHeight, src: imageUrl });
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
