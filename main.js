var HALF_PI = Math.PI / 2;
var HALF_PHONE_WIDTH;
var DATE = new Date();
var BLACK = 0x283954;
var BLACK_HEX = "#283954";

var _width, _height;
var _renderer, _camera, _raycaster;
var _scene = new THREE.Scene();
var _controls = {
	touch: false,
	pos: new THREE.Vector2(),
	prevPos: new THREE.Vector2(),
	offset: new THREE.Vector2(),
	speed: 5,
	update: function() {
		if (_controls.offset) {
			if (_controls.offset.x > 0 || _controls.offset.y > 0) {
				let offsetX = _controls.offset.x * 0.05;
				let offsetY = _controls.offset.y * 0.05;

				_current_scene.rotation.y += offsetX;
				_current_scene.rotation.x += offsetY;

				_current_scene.rotation.x = cap(_current_scene.rotation.x, -HALF_PI, HALF_PI);

				_controls.offset.x -= offsetX;
				_controls.offset.y -= offsetY;
			}
		}
	}
};
var _current_scene = null;

var _phone = document.getElementById("phone_screen").getContext("2d");
var _phone_screen = new THREE.CanvasTexture(_phone.canvas);

const roundedRectShape = new THREE.Shape();
( function roundedRect( ctx, x, y, width, height, radius ) {
	ctx.moveTo( x, y + radius );
	ctx.lineTo( x, y + height - radius );
	ctx.quadraticCurveTo( x, y + height, x + radius, y + height );
	ctx.lineTo( x + width - radius, y + height );
	ctx.quadraticCurveTo( x + width, y + height, x + width, y + height - radius );
	ctx.lineTo( x + width, y + radius );
	ctx.quadraticCurveTo( x + width, y, x + width - radius, y );
	ctx.lineTo( x + radius, y );
	ctx.quadraticCurveTo( x, y, x, y + radius );
} )( roundedRectShape, 0, 0, 1, 1.5, 0.15 );

function init() {
	// load assets

	let soundcounter = 0;
	for (const name in assets.sounds) {
		let file = assets.sounds[name];
		assets.sounds[name] = new Howl(file);
		soundcounter++;

		assets.sounds[name].on('load', function() {
			soundcounter--;
			if (soundcounter == 0) {
				console.log("all sounds loaded.");
				loadimgs();
			}
		});
	}

	function loadimgs() {
		var imgs = {};
		let imgcounter = 0;
		for (const name in assets.images) {
			let filename = assets.images[name];
			imgs[name] = document.createElement("img");
			imgs[name].src = filename;
			imgcounter++;

			imgs[name].onload = function() {
				imgcounter--;
				if (imgcounter == 0) {
					console.log("all images loaded.");
					init_3d();
				}
			}
		}
		assets.images = imgs;
	}
}

function init_3d() {
	getSize();

	_renderer = new THREE.WebGLRenderer({ alpha: true });
	// _renderer.setClearColor( 0x000000, 0 );
	_renderer.setSize( _width, _height );
	_renderer.domElement.classList.add("centered");
	_renderer.setPixelRatio(window.devicePixelRatio * 1.25);
	document.body.appendChild( _renderer.domElement );

	const fov = 75;
	const aspect = 2;
	const near = 1;
	const far = 30;
	_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	_camera.position.z = 2;

	_raycaster = new THREE.Raycaster();

	// controls

	document.addEventListener("mousedown", function() {
		_controls.touch = true;
	});
	document.addEventListener("mousemove", function(e) {
		_controls.move(e);
	});
	document.addEventListener("mouseup", function(e) {
		_controls.select(e);
	});
	document.addEventListener("blur", function(e) {
		_controls.select(e);
	});

	//

	_phone.canvas.width = 1000 * 0.9;
	_phone.canvas.height = 1000 * 1.5 * 0.9;
	HALF_PHONE_WIDTH = _phone.canvas.width/2;
	_phone.textAlign = "center";

	//

	_scene.add(new THREE.AmbientLight(0xffffff, 0.9));

	const light1 = new THREE.DirectionalLight(0xf2c46f, 0.75);
	light1.position.x = -1;
	light1.position.z = 1;
	const light2 = new THREE.DirectionalLight(0xf2c46f, 0.1);
	light2.position.x = 1;
	// light2.position.z = -1;
	_scene.add( light1 );
	_scene.add( light2 );

	draw();
}

function draw() {
	DATE = new Date();

	// draw phone screen
	// _phone.fillStyle = "#00ff00";
	// _phone.fillRect(0, 0, _phone.canvas.width, _phone.canvas.height);

	_phone.drawImage(assets.images.forest, 0, 0);

	let x = HALF_PHONE_WIDTH;
	let y = 300;
	let hour = DATE.getHours() > 12 ? DATE.getHours() - 12 : DATE.getHours();
	let minute = DATE.getMinutes() < 10 ? "0"+DATE.getMinutes() : DATE.getMinutes();
	_phone.font = '200px Futura';
	_phone.fillStyle = BLACK_HEX;
  	_phone.fillText(hour+":"+minute, x, y);
  	_phone.font = '75px Futura';
  	_phone.fillText(DATE.getFullYear()+"/"+DATE.getMonth()+"/"+DATE.getDate(), x, y+100);

	_controls.update();

	// _raycaster.setFromCamera(new THREE.Vector2(), _camera);
	// const intersects = _raycaster.intersectObjects(_scene.children);
	// if (intersects[0]) {
	// 	intersects[0].object.material.color.set(0xff0000);
	// }

	// render


	_phone_screen.needsUpdate = true;
	_renderer.render(_scene, _camera);

	requestAnimationFrame(draw);
}

_controls.move = function(e) {
	_controls.prevPos.set(_controls.pos.x, _controls.pos.y);
	_controls.pos.set(
		( event.pageX / _width ) * 2 - 1,
		( event.pageY / _height ) * 2 + 1
	);

	// hold and drag action
	if (_controls.touch) {
		_controls.offset.set(
			(_controls.pos.x - _controls.prevPos.x) * _controls.speed,
			(_controls.pos.y - _controls.prevPos.y) * _controls.speed
		);

		_current_scene.rotation.y += _controls.offset.x;
		_current_scene.rotation.x += _controls.offset.y;

		_current_scene.rotation.x = cap(_current_scene.rotation.x, -HALF_PI, HALF_PI);
	}

	// move action

}

_controls.select = function(e) { // mouseup
	// click

	// reset
	_controls.touch = false;
}

function cap(value, min, max) {
	if (value < min) {
		return min
	}

	if (value > max) {
		return max
	}

	return value
}

function getSize() {
	_height = window.innerHeight;
	_width = _height/9*16;
}

function getMousePosition( dom, x, y ) {
	const rect = dom.getBoundingClientRect();
	return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];
}

window.onresize = getSize;