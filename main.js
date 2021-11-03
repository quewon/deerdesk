var HALF_PI = Math.PI / 2;
var HALF_PHONE_WIDTH;
var DATE = new Date();

var _width, _height;
var _renderer, _camera, _scene, _raycaster;
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

				_scene.rotation.y += offsetX;
				_scene.rotation.x += offsetY;

				_scene.rotation.x = cap(_scene.rotation.x, -HALF_PI, HALF_PI);

				_controls.offset.x -= offsetX;
				_controls.offset.y -= offsetY;
			}
		}
	}
};

var _phone = document.getElementById("phone_screen").getContext("2d");
var _phone_screen;

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

	_scene = new THREE.Scene();

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

	//

	_phone.canvas.width = 1000 * 0.9;
	_phone.canvas.height = 1000 * 1.5 * 0.9;
	HALF_PHONE_WIDTH = _phone.canvas.width/2;
	_phone.textAlign = "center";
	_phone_screen = new THREE.CanvasTexture(_phone.canvas);

	const phonecase = new THREE.Mesh(
		new THREE.ExtrudeGeometry(roundedRectShape, {
			steps: 1,
			depth: 0.25,
			bevelEnabled: false,
			bevelThickness: 1,
			bevelSize: 1,
			bevelOffset: 0,
			bevelSegments: 1
		}),
		new THREE.MeshPhongMaterial({
			color: 0xf2c46f,
			shininess: 50,
			specular: 0x050505,
		})
	);
	phonecase.position.x -= 0.5;
	phonecase.position.z -= 0.125;
	phonecase.position.y -= 0.75;
	const phonebutton = new THREE.Mesh(
		new THREE.ExtrudeGeometry(roundedRectShape, {
			steps: 1,
			depth: 0.05,
			bevelEnabled: false,
			bevelThickness: 1,
			bevelSize: 1,
			bevelOffset: 0,
			bevelSegments: 1
		}),
		new THREE.MeshPhongMaterial({
			color: 0xf2c46f,
			shininess: 50,
			specular: 0x050505,
		})
	);
	phonebutton.scale.set(0.1, 0.1, 0.5);
	phonebutton.rotation.y += HALF_PI;
	phonebutton.position.x += 0.5;
	phonebutton.position.z += 0.0375;
	phonebutton.position.y += 0.25;
	const phonescreen = new THREE.Mesh(
		new THREE.PlaneGeometry(0.75, 1.25),
		// new THREE.ShapeGeometry(roundedRectShape),
		new THREE.MeshPhongMaterial({
			map: _phone_screen,
			shininess: 150,
			roughness: 0,
			emissive: 0x1f401e,
			metalness: .9,
			reflectivity: 0.2,
			refractionRatio: 0.985,
			ior: 0.9,
			specular: 0x050505,
		})
	);
	// phonescreen.scale.set(0.9, 0.9, 0.9);
	// phonescreen.position.x -= 0.45;
	// phonescreen.position.y -= 0.69;
	phonescreen.position.z += 0.1365;
	const phonebevel = new THREE.Mesh(
		new THREE.ExtrudeGeometry(roundedRectShape, {
			steps: 1,
			depth: 0.025,
			bevelEnabled: false,
			bevelThickness: 1,
			bevelSize: 1,
			bevelOffset: 0,
			bevelSegments: 1
		}),
		new THREE.MeshPhongMaterial({
			color: 0x283954,
			shininess: 150,
			roughness: 0,
			metalness: .9,
			reflectivity: 0.2,
			refractionRatio: 0.985,
			ior: 0.9,
			specular: 0x050505,
		})
	);
	phonebevel.scale.set(0.95, 0.95, 0.95);
	phonebevel.position.x -= 0.475;
	phonebevel.position.y -= 0.725;
	phonebevel.position.z += 0.1125;
	const phonecamera = new THREE.Mesh(
		new THREE.CylinderGeometry(0.05, 0.05, 0.016, 24),
		new THREE.MeshPhongMaterial({
			color: 0x283954,
			shininess: 150,
			roughness: 0,
			metalness: .9,
			reflectivity: 0.2,
			refractionRatio: 0.985,
			ior: 0.9,
			specular: 0x050505,
		})
	);
	phonecamera.rotation.x += HALF_PI;
	phonecamera.position.y += 0.625;
	phonecamera.position.z -= 0.125;
	const phoneflash = new THREE.Mesh(
		new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12),
		new THREE.MeshPhongMaterial({
			color: 0xf0eddd,
			// emissive: 0xf0eddd,
			shininess: 150,
			roughness: 0,
			metalness: .9,
			reflectivity: 0.2,
			refractionRatio: 0.985,
			ior: 0.9,
			specular: 0x050505,
		})
	);
	phoneflash.rotation.x += HALF_PI;
	phoneflash.position.y += 0.525;
	phoneflash.position.z -= 0.125;
	_scene.add(phonebevel);
	_scene.add(phonescreen);
	_scene.add(phonecase);
	_scene.add(phonebutton);
	_scene.add(phonecamera);
	_scene.add(phoneflash);

	_scene.add( new THREE.AmbientLight( 0xffffff, 0.9 ) );

	const lighting = new THREE.DirectionalLight( 0xf2c46f, 1 );
	lighting.position.x = -1;
	lighting.position.z = 1;
	_scene.add( lighting );

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
	let hour = DATE.getHours() > 12 ? DATE.getHours() - 12 : DATE.getHour();
	let minute = DATE.getMinutes() < 10 ? "0"+DATE.getMinutes() : DATE.getMinutes();
	_phone.font = '200px Futura';
	_phone.fillStyle = "#000";
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

		_scene.rotation.y += _controls.offset.x;
		_scene.rotation.x += _controls.offset.y;

		_scene.rotation.x = cap(_scene.rotation.x, -HALF_PI, HALF_PI);
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

window.onload = function() {
	init();
};