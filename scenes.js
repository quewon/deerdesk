var assets = {
	images: {
		"forest": "images/forest.png",
	},
	sounds: {
		"alarm": { src: "sounds/alarm.wav", loop: true },
	},
};
var ref = [];

class scene {
	constructor(p) {
		this.id = ref.length;
		this.objects = p.objects;

		var group = new THREE.Group();
		p.init(group);
		group.visible = false;
		_scene.add(group);

		this.group = group;

		ref.push(this);
	}

	load() {
		if (_current_scene) {
			_current_scene.visible = false;
		}

		this.group.visible = true;
		this.group.rotation.set(0, 0, 0);

		_current_scene = this.group;
	}
}

class object {
	constructor(p) {
		
	}
}

var phone = new scene({
	music: "alarm",
	init: function(group) {
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
				color: BLACK,
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
		phonebevel.position.y -= 0.713;
		phonebevel.position.z += 0.1125;
		const phonecamera_bevel = new THREE.Mesh(
			new THREE.CylinderGeometry(0.05, 0.05, 0.016, 24),
			new THREE.MeshPhongMaterial({
				color: 0xf2c46f,
				shininess: 50,
				specular: 0x050505,
			})
		);
		phonecamera_bevel.scale.set(1.1, 1.5, 1.1);
		phonecamera_bevel.rotation.x += HALF_PI;
		phonecamera_bevel.position.y += 0.625;
		phonecamera_bevel.position.z -= 0.12;
		const phonecamera = new THREE.Mesh(
			new THREE.CylinderGeometry(0.05, 0.05, 0.016, 24),
			new THREE.MeshPhongMaterial({
				color: BLACK,
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

		const _logo = document.createElement("canvas").getContext("2d");
		_logo.canvas.width = 250;
		_logo.canvas.height = 250;
		_logo.fillStyle = "#f2c46f";
		_logo.fillRect(0, 0, 250, 250);
		_logo.textAlign = "center";
		_logo.font = "200px Futura";
		_logo.fillStyle = BLACK_HEX;
		_logo.beginPath();
		_logo.arc(125, 125, 125, 0, Math.PI*2);
		_logo.closePath();
		_logo.fill();
		_logo.fillStyle = "#f2c46f";
		_logo.fillText(":)", 125, 185);
		const _logo_texture = new THREE.CanvasTexture(_logo.canvas);
		
		HALF_PHONE_WIDTH = _phone.canvas.width/2;
		_phone.textAlign = "center";
		const logo = new THREE.Mesh(
			new THREE.PlaneGeometry(0.25, 0.25),
			new THREE.MeshPhongMaterial({
				map: _logo_texture,
				shininess: 150,
				roughness: 0,
				metalness: .9,
				reflectivity: 0.2,
				refractionRatio: 0.985,
				ior: 0.9,
				specular: 0x050505,
			})
		);
		logo.rotation.y += Math.PI;
		logo.rotation.z -= HALF_PI;
		logo.position.z -= 0.12501;

		group.add(phonebevel);
		group.add(phonescreen);
		group.add(phonecase);
		group.add(phonebutton);
		group.add(phonecamera_bevel);
		group.add(phonecamera);
		group.add(phoneflash);
		group.add(logo);
	}
});

// var bedroom = new scene({
// 	objects: [
// 		new object({
// 			src: "deer.png",
// 			pos: [0, 0],
// 		})
// 	],
// });