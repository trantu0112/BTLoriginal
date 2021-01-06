// Picking.js
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' + // Biến thuộc tính vị trí
  'attribute vec4 a_Color;\n' +    // Biến thuộc tính màu
  'attribute float a_Face;\n' +   // Số bề mặt (Không thể sử dụng int cho biến thuộc tính)
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform int u_PickedFace;\n' + // Số bề mặt của khuôn mặt đã chọn (biến đồng nhất)
  'varying vec4 v_Color;\n' +   // Biến thay đổi
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' + // Phép biến đổi hình chiếu chế độ xem mô hình trên vị trí đỉnh
  '  int face = int(a_Face);\n' + // Chuyển đổi thành int
  '  vec3 color = (face == u_PickedFace) ? vec3(0.0, 0.0, 0.0) : a_Color.rgb;\n' + //Tất cả các thành phần đều = Nếu là 1 , nó là màu đen tại thời điểm này; nếu không, màu của đỉnh vẫn là màu trước đó
  '  if(u_PickedFace == 0) {\n' + // nếu click = 0, hãy đặt số mặt thành v_Color
  // Ba thành phần đầu tiên RGB và thành phần thứ tư được sử dụng để xác định đỉnh nào được nhấp Mặt
  '    v_Color = vec4(color, a_Face/255.0);\n' + // Thành phần thứ tư của màu làm cho độ trong suốt của đồ họa khác đi
  '  } else {\n' +
  '    v_Color = vec4(color, a_Color.a);\n' +
  '  }\n' +
  '}\n';

// Fragment shader program                                            
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' + // Thiết lập màu
  '}\n';

var ANGLE_STEP = 0.0; // Góc xoay (độ / giây)
var g_currentAngle = 0.0; // Góc quay hiện tại
//var g_angleStepRL = 0.0;

function main() {
  // Gọi phần tử canvas
  var canvas = document.getElementById('webgl');

  // Lấy ngữ cảnh dựng hình cho WebGL
  var gl = getWebGLContext(canvas);

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

   // khởi tạo bộ đổ bóng
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Thiết lập toạ độ đỉnh và màu
  var n = initVertexBuffers(gl);

  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Kích hoạt màu nền và kích hoạt khử mặt khuất
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Lấy mô hình vị trí lưu trữ của ma trận hình chiếu khung nhìn, lấy vị trí của bề mặt nhấp chuột
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_PickedFace = gl.getUniformLocation(gl.program, 'u_PickedFace');

  if (!u_MvpMatrix || !u_PickedFace) { 
    console.log('Failed to get the storage location of uniform variable');
    return;
  }

  // Thiết lập điểm mắt và khối quan sát
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0); // Phép chiếu
  viewProjMatrix.lookAt(2.0, 2.0, 6.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0); // Góc nhìn quan sát

  // Khởi tạo bề mặt
  gl.uniform1i(u_PickedFace, -1);

  // Đăng ký trình xử lý sự kiện click chuột
  canvas.onmousedown = function(ev) {   // Chuột được nhấn
    var x = ev.clientX, y = ev.clientY; // Toạ độ trỏ chuột
    var rect = ev.target.getBoundingClientRect();
    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      // Nếu vị trí Đã nhấp nằm bên trong <canvas>, hãy cập nhật bề mặt đã chọn
      updatePickedFace(gl, n, x - rect.left, rect.bottom - y, u_PickedFace, viewProjMatrix, u_MvpMatrix);
    }
  }

  var tick = function() {   // Start drawing
    g_currentAngle = animate(g_currentAngle);
    draw(gl, n, g_currentAngle, viewProjMatrix, u_MvpMatrix);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3

  var vertices = new Float32Array([   // Toạ độ đỉnh
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
  ]);

  var colors = new Float32Array([   // Màu
     1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,    // v0-v1-v2-v3 front
     0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,    // v0-v3-v4-v5 right
     0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,    // v0-v5-v6-v1 up
     1.0, 1.0, 0.0,   1.0, 1.0, 0.0,   1.0, 1.0, 0.0,   1.0, 1.0, 0.0,    // v1-v6-v7-v2 left
     1.0, 0.0, 1.0,   1.0, 0.0, 1.0,   1.0, 0.0, 1.0,   1.0, 0.0, 1.0,    // v7-v4-v3-v2 down
     0.0, 1.0, 1.0,   0.0, 1.0, 1.0,   0.0, 1.0, 1.0,   0.0, 1.0, 1.0     // v4-v7-v6-v5 back
   ]);

  var faces = new Uint8Array([   // Mặt
    1, 1, 1, 1,     // v0-v1-v2-v3 front
    2, 2, 2, 2,     // v0-v3-v4-v5 right
    3, 3, 3, 3,     // v0-v5-v6-v1 up
    4, 4, 4, 4,     // v1-v6-v7-v2 left
    5, 5, 5, 5,     // v7-v4-v3-v2 down
    6, 6, 6, 6,     // v4-v7-v6-v5 back
  ]);

  // Chỉ số của các đỉnh
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);

  // Tạo một bộ đệm đối tượng
  var indexBuffer = gl.createBuffer();

  if (!indexBuffer) {
    return -1;
  }

  // Ghi thông tin vào bộ đệm đối tượng 
  if (!initArrayBuffer(gl, vertices, gl.FLOAT, 3, 'a_Position')) return -1; // Coordinate Information
  if (!initArrayBuffer(gl, colors, gl.FLOAT, 3, 'a_Color')) return -1;      // Color Information
  if (!initArrayBuffer(gl, faces, gl.UNSIGNED_BYTE, 1, 'a_Face')) return -1;// Surface Information

  // Bỏ liên kết bộ đệm đối tượng 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Ghi các chỉ số vào đối tượng đệm
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

// Phát hiện bề mặt nào được chọn ([Trả lại số bề mặt theo vị trí của điểm])
function updatePickedFace(gl, n, x, y, u_PickedFace, viewProjMatrix, u_MvpMatrix) {
  var pixels = new Uint8Array(4); // Mảng để lưu trữ giá trị pixel [R,G,B,A]

  // Ghi số bề mặt(A) vào thành phần (nếu được chọn) 
  // Sau khi nhấp chuột, biến u_PickedFace sẽ được thay đổi từ -1 thành 0
  gl.uniform1i(u_PickedFace, 0);  // Vẽ bằng cách viết số bề mặt thành giá trị alpha

  // Lúc này, giá trị của mỗi bề mặt phụ thuộc vào số bề mặt 
  // (bước vẽ này sẽ được thực hiện trong bộ đệm màu và sẽ không hiển thị trên màn hình)
  draw(gl, n, g_currentAngle, viewProjMatrix, u_MvpMatrix);

  // Đọc giá trị pixel của vị trí được nhấp. pixel [3] là số bề mặt
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.uniform1i(u_PickedFace, pixels[3]); // Chuyển số bề mặt cho u_PickedFace
}

var g_MvpMatrix = new Matrix4(); // Ma trận chiếu chế độ xem mô hình
function draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix) {
  // Tính toán Ma trận chiếu ở chế độ chuyển động và truyền nó tới u_MvpMatrix
  g_MvpMatrix.set(viewProjMatrix);

  //g_MvpMatrix.rotate(g_angleStepRL, 0.0, 1.0, 0.0);

  //g_MvpMatrix.rotate(g_angleStepUD, 0.0, 0.0, 1.0);

  g_MvpMatrix.rotate(g_currentAngle, 1.0, 0.0, 0.0);
  g_MvpMatrix.rotate(g_currentAngle, 0.0, 1.0, 0.0);
  g_MvpMatrix.rotate(g_currentAngle, 0.0, 0.0, 1.0);

  gl.uniformMatrix4fv(u_MvpMatrix, false, g_MvpMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);     // Vùng đệm màu nền và chiều sâu
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);   // Vẽ hình lập phương
}

var last = Date.now(); // Lần cuối cùng mà hàm này được gọi là
function animate(angle) {
  var now = Date.now();   // Tính thời gian đã trôi qua
  var elapsed = now - last;
  last = now;
  // Cập nhật góc quay hiện tại (điều chỉnh theo thời gian đã trôi qua)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

function initArrayBuffer (gl, data, type, num, attribute) {
  var buffer = gl.createBuffer();// Tạo một đối tượng đệm

  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Ghi dữ liệu vào bộ đệm đối tượng
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Gán đối tượng đệm đối tượng cho biến thuộc tính
  var a_attribute = gl.getAttribLocation(gl.program, attribute);

  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }

  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Kích hoạt lệnh gán bộ đệm đối tượng cho biến thuộc tính
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

function up() {
  ANGLE_STEP -= 10.0;
}

function down() {
  ANGLE_STEP += 10.0;
}

function right() {
  g_angleStepRL += 10.0;
}

function left() {
  g_angleStepRL -= 10.0;
}

function start() {
  ANGLE_STEP += 50.0;
}

function stop() {
  ANGLE_STEP = 0.0;
}

