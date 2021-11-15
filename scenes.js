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

class screen {
	constructor(p) {
		this.id = ref.length;

		ref.push(this);
	}

	check() {

	}
}

var phone = new scene({
	music: "alarm",
	init: function(group) {
		// group.add(thing);
	},
});

// var bedroom = new scene({
// 	objects: [
// 		new object({
// 			src: "deer.png",
// 			pos: [0, 0],
// 		})
// 	],
// });