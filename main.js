let obsidian = require('obsidian');

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

let DEFAULT_SETTINGS = {
	// do we show the "#" for tags
	showHash: true,
	// do we create a css for the shortened tags
	cssForShorten: true,
	// add a css class based on the tag parents
	cssForParent: false,
	// add a css class based on the tag
	cssForAll: false,
	shortenAll:false,
	tags: []
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

let CSS = {
	"exspan": "snsvrno-tags-example",
	"extext": "snsvrno-tags-example-text",
	"exdiv": "snsvrno-tags-example-container",
	"class": "snsvrno-tags-class",
	"count": "snsvrno-tags-matches-count",
	"def": "snsvrno-tags-def",
	"defpreview": "snsvrno-tags-def-preview",

	// used for things like the wildcards or other things
	// that that I would put in `t` to show the literal char.
	"key": "snsvrno-tags-keyword",
	"keydiv": "snsvrno-tags-keyword-div"
}

let STRINGS = {

	"headings" : {
		"classes": "Classes",
		"tags": "Tag Definitions"
	},

	"buttons" : {
		"add" : "+",
		"remove" : "X"
	},

	"cssDoesNotOverwrite": "Does not overwrite any other CSS.",

	"cssForAll" : {
		"name": "Add a CSS Class for All Tags",
		"desc": "Creates a CSS class for each tag, based on that tag name."
	},

	"cssForParent" : {
		"name": "Add a CSS Class for Parents",
		"desc": "Creates a CSS class for each tag based on its parents."
	},

	"cssForShorten" : {
		"name": "Add a CSS Class for Shortened",
		"desc": "Creates a CSS class for each tag that is shortened.",
		"desc2": "Only creates classes for the shorten definitions below, not shorten all."
	},

	"notag" : "No matching tags currently found in vault.",

	"preview" : {
		"text": "Preview: ",
		"css": "CSS class: "
	},

	"shortenAll" : {
		"name": "Shorten All Tags",
		"desc": "Shorten the display of all tags to only the lowest level child.",
		"desc2": "Shorten definitions will still apply, and will take priority over this shortening methodology."
	},

	"showHash" : {
		"name": "Show Hash",
		"desc": "Show the '#' for tags in preview."
	},

	"tags" : {
		"name": "Tags",
		"desc": "List of tag parents for shortening in preview mode."
	}

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

class SnsvrnoTagsPlugin extends obsidian.Plugin {

	// CORE //////////////////////

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SnsvrnoTagsSettingsTab(this.app, this));

		this.registerMarkdownPostProcessor((e) => {
			e.querySelectorAll("a.tag").forEach((a) => this.formatTag(a));
		});
	}

	onunload() {
		// nothing to unload for now?
	}

	// SETTINGS RELATED /////

	async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
    await this.saveData(this.settings);
	}

	// PLUGIN SPECIFIC ////////////

	// formats the string as if it were a tag by checking
	// if we should display the "#" or not
	formatTagHash(str) {
		if (this.settings.showHash) {
			if (str.charAt(0) == "#") return str;
			else return "#" + str;
		} else {
			if (str.charAt(0) == "#") return str.substring(1);
			else return str;
		}
	}

	// runs the processing on the given tag, will check that
	// it is actually a tag before doing anything.
	//
	// el : HTMLElement - the tag in question, should be an 'a.tag'
	formatTag(el) {

		///////////////////////////////////
		// double checks that these are tags, will not
		// continue processing if its not
		if (el.text.substring(0,1) != "#") return;

		var original = el.text;

		if (this.settings.cssForAll)
			el.className += " " + fn.generateClassName(original);

		if (this.settings.cssForParent)
			el.className += " " + fn.generateClassName(fn.parents(original));

		/////////////////////////////////
		// shortens the tag if applicable
		for (let i = 0; i < this.settings.tags.length; i++) {
			// [OTGI0004] look at caching these so that we are not calculating
			// it for every page and tag
			const reftag = fn.makeReg(this.settings.tags[i]);

			if (el.text.match(reftag)) {
				el.text = el.text.replace(reftag, "");

				///////////////////////////////////
				// adds the class
				if (this.settings.cssForShorten)
					el.className += " " + fn.generateClassName(this.settings.tags[i]);

				break;
			}
		}

		// things to do if we didn't shorten by def
		if (el.text == original) {
			if (this.settings.shortenAll) {
				el.text = el.text.split("/").pop();
			}
		}

		// the mouse over text
		if (el.text != original) el.title = original;

		el.text = this.formatTagHash(el.text);
	}
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

class SnsvrnoTagsSettingsTab extends obsidian.PluginSettingTab {

	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(focusId) {
		this.containerEl.empty();

		this.opShowHash();
		this.createSettingBool(this.containerEl, "shortenAll");

		this.containerEl.createEl("h2", {text:STRINGS.headings.classes});
		this.createSettingBool(this.containerEl, "cssForShorten");
		this.opCreateCssForParent();
		this.opCreateCssForAll();

		this.containerEl.createEl("h2", {text:STRINGS.headings.tags});
		this.opTags(this.containerEl, focusId);
	}

	////////////////////////////////////
	opCreateCssForAll() {
		const setting = this.createSettingBool(this.containerEl, "cssForAll");
		setting.descEl.createEl("div", {text: STRINGS.cssDoesNotOverwrite});

		// the preview showing if and how the hash will be
		// displayed
		let previewBlock = this.createExampleBlock(setting.descEl);
		let tag = fn.getTagsSingle("#example-tag");

		let cls = fn.generateClassName(tag);
		this.createTagEl(
			previewBlock,
			this.plugin.formatTagHash(tag),
			cls
		);

		let cssClass = this
			.createExampleBlock(setting.descEl,STRINGS.preview.css)
			.createEl("span", {text:cls});
		Object.assign(cssClass, {className:CSS.class});
	}

	////////////////////////////////////
	opCreateCssForParent() {
		const setting = this.createSettingBool(this.containerEl, "cssForParent");
		setting.descEl.createEl("div", {text: STRINGS.cssDoesNotOverwrite});

		// the preview showing if and how the hash will be
		// displayed
		let previewBlock = this.createExampleBlock(setting.descEl);
		let tag = fn.getTagsLong("#example/tag");

		let cls = fn.generateClassName(fn.parents(tag));
		this.createTagEl(
			previewBlock,
			this.plugin.formatTagHash(tag),
			cls
		);

		let cssClass = this
			.createExampleBlock(setting.descEl, STRINGS.preview.css)
			.createEl("span", {text:cls});
		Object.assign(cssClass, {className:CSS.class});
	}

	////////////////////////////////////
	opShowHash() {
		let exampleTag;
		let setting = this.createSettingBool(this.containerEl, "showHash");

		// the preview showing if and how the hash will be
		// displayed
		let previewTagName = fn.getTagsLong("#example/tag");
		this.createTagEl(
			this.createExampleBlock(setting.descEl),
			this.plugin.formatTagHash(previewTagName)
		);
	}

	// el : HTMLElement - the container element that holds the settings items
	// ?focusId : string - the name of the tag item that requested a "diplay()"
	//                     update. (used so that we can have live previews of the
	//                     settings update as the user types)
	opTags(el, focusId) {

		let setting = new obsidian.Setting(el)
			.setName(STRINGS.tags.name)
			.setDesc(STRINGS.tags.desc);
		setting.descEl.createEl("div", {text:"Available wildcards:"});

		// rules
		let line1 = setting.descEl.createEl("div");
		Object.assign(line1,{ className:CSS.keydiv});
		Object.assign(line1.createEl("span", {text:"*"}), {className:CSS.key});
		line1.createEl("span",{text:" matches all characters except for "});
		Object.assign(line1.createEl("span", {text:"/"}), {className:CSS.key});

		// creates a new line for each user tag setting

		this.plugin.settings.tags.forEach(
			(tagDef) => this.createSettingTag(tagDef, el, focusId)
		);

		// creates the "add" button at the end
		let div = el.createDiv();
		new obsidian.Setting(div)
			.addButton((btn) => {
				btn.setButtonText(STRINGS.buttons.add);
				btn.setTooltip("Add another matching expression.");
				btn.onClick(async (_) => {
					this.plugin.settings.tags.push("#parent/tag");
					this.plugin.saveSettings();
					this.display();
				});
			});
	}

	////////////////////////////////////

	// creates the basic elements for the "preview" that is displayed
	// under setting to immediately show their impact.
	createExampleBlock(el, text, spanclass) {
		let example = el.createEl("span");
		Object.assign(example, {className: CSS.exspan});
		if (spanclass != undefined) example.className += " " + spanclass;

		let exampletext = example.createEl("p", {text: text ? text : STRINGS.preview.text});
		Object.assign(exampletext, {className: CSS.extext});

		let examplecontainer = example.createEl("div");
		Object.assign(examplecontainer, {className: CSS.exdiv});

		return examplecontainer;
	}

	// creates the tag element with the correct classes
	createTagEl(el, text, otherClass) {
		let tag = el.createEl("a", { text: text })
		Object.assign(tag, {
			className: "tag" + (otherClass ? " " + otherClass : "")
		});
		return tag;
	}

	// creates the boilerplate settings stuff
	// element : HTMLElement
	// section : string - the name of the section in STRING that contains name,desc
	createSettingBool(element, section) {
		const opt = new obsidian.Setting(element);
		opt.setName(STRINGS[section].name);
		opt.setDesc(STRINGS[section].desc);

		opt.addToggle(t => t
				.setValue(this.plugin.settings[section])
				.onChange(async (v) => {
					this.plugin.settings[section] = v;
					this.plugin.saveSettings();
					this.display();
				})
		);

		// adds additional divs to the desc based on the number
		// of desc# that are in the str section
		let i = 2;
		while (STRINGS[section]["desc" + i] != undefined) {
			opt.descEl.createEl("div", {text:STRINGS[section]["desc" + i]});
			i += 1;
		}

		return opt;
	}

	createSettingTag(def, parent, focusId) {
		const index = this.plugin.settings.tags.indexOf(def);

		let div = parent.createDiv();
		div.className = CSS.def;
		let setting = new obsidian.Setting(div)
			.addText(txt => {
				txt.setValue(def);
				txt.onChange(async (v) => {
					this.plugin.settings.tags[index] = v;
					this.plugin.saveSettings();
					this.display("tags_"+v);
					});

				// focus on this text box so we can continue to type
				// and update the previews
				if (focusId == "tags_" + def) txt.inputEl.focus();
			})
			.addButton(btn => {
				btn.setButtonText(STRINGS.buttons.remove);
				btn.setTooltip("Remove rule '" + def + "'");
				btn.onClick(async (_) => {
					this.plugin.settings.tags.splice(index, 1);
					this.plugin.saveSettings();
					this.display();
				});
			});


		// preview

		let preview = this.createExampleBlock(setting.descEl, null, CSS.defpreview);
		const tagDefReg = fn.makeReg(def);
		let foundMatch = false;
		let matchCount = 0;
		let vaultTags = Object.keys(app.metadataCache.getTags());
		for (let i = 0; i < vaultTags.length; i++) {
			if (vaultTags[i].match(tagDefReg)) {
				// this happens on the 2nd+ match so we can get the
				// counts but don't need to make the preview anymore
				if (foundMatch) matchCount += 1;
				else {
					let newTag = vaultTags[i].replace(tagDefReg,"");
					this.createTagEl(preview, this.plugin.formatTagHash(vaultTags[i]));
					preview.createEl("span", { text: "=>" });
					let newcls;
					if (this.plugin.settings.createCssForShorten)
						newcls = fn.generateClassName(def);
					this.createTagEl(preview,this.plugin.formatTagHash(newTag), newcls);
					foundMatch = true;
					matchCount = 1;
				}
			}
		}

		// if no tags exist, let the user know in the case there is a typo
		// or that no matches is unexpected.
		if (!foundMatch) {
			let msg = preview.createEl("span", {text:STRINGS.notag});
			Object.assign(msg, {className:"setting-item-description"});
		} else {

			let matchesEl = this
				.createExampleBlock(setting.descEl, "Unique tag matches:")
				.createEl("span", {text:matchCount});
			Object.assign(matchesEl, {className:CSS.count});

			if (this.plugin.settings.cssForShorten) {
				let cls = fn.generateClassName(def);
				let cssClass = this
					.createExampleBlock(setting.descEl,STRINGS.preview.css)
					.createEl("span", {text:cls});
				Object.assign(cssClass, {className:CSS.class});
			}
		}

		return setting;
	}
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

class fn {
	static makeReg(def) {
		if (def.substring(def.length-1,1) != "/") def = def += "/";
		let reg = new RegExp(def.replaceAll("*", "[^\/]*"))
		return reg;
	}

	static generateClassName(def) {
		let name = def.substring(1);
		name = name.replaceAll("*","wc");
		name = name.replaceAll("/","_");
		return "tag-"+ name;
	}

	// gets a tag that has parents
	// ifnull : string - what to return if we don't find anything
	static getTagsLong(ifnull) {
		const tags = Object.keys(app.metadataCache.getTags());
		for (let i = 0; i < tags.length; i++) {
			if (tags[i].split("/").length > 1) {
				return tags[i];
			}
		}
		return ifnull;
	}

	// gets a tag that has no parents
	// ifnull : string - what to return if we don't find anything
	static getTagsSingle(ifnull) {
		const tags = Object.keys(app.metadataCache.getTags());
		for (let i = 0; i < tags.length; i++) {
			if (tags[i].split("/").length == 1) {
				return tags[i];
			}
		}
		return ifnull;
	}

	static parents(tag) {
		return tag.split("/").slice(0,tag.split("/").length-1).join("/");
	}

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = SnsvrnoTagsPlugin
