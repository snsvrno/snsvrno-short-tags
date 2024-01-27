let obsidian = require('obsidian');

let DEFAULT_SETTINGS = {
	showHash: true,
	tags: []
};

//////////////////////////////////////////////////////////////

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

	// runs the processing on the given tag, will check that
	// it is actually a tag before doing anything.
	//
	// el : HTMLElement - the tag in question, should be an 'a.tag'
	formatTag(el) {

		///////////////////////////////////
		// double checks that these are tags, will not
		// continue processing if its not
		if (el.text.substring(0,1) != "#") return;

		/////////////////////////////////
		// shortens the tag if applicable
		for (let i = 0; i < this.settings.tags.length; i++) {
			// [OTGI0004] look at caching these so that we are not calculating
			// it for every page and tag
			let reftag = this.settings.tags[i].substring(1).split("/");

			if (fn.tagSplitMatch(reftag,el.text)) {
				el.text = fn.tagSplitShorten(reftag, el.text);
				break;
			}
		}

		//////////////////////////////////
		// removes the "hash" if that is enabled
		if (!this.settings.showHash) el.text = el.text.substring(1);
	}
}

////////////////////////////////////////////////////////////

class SnsvrnoTagsSettingsTab extends obsidian.PluginSettingTab {

	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(focusId) {
		this.containerEl.empty();
		this.opShowHash(this.containerEl);
		this.opTags(this.containerEl, focusId);
	}

	////////////////////////////////////
	opShowHash(el) {
		let exampleTag;

		let setting = new obsidian.Setting(el)
			.setName("Show Hash")
			.setDesc("Show the '#' for tags in preview.")
			.addToggle(t => t
				.setValue(this.plugin.settings.showHash)
				.onChange(async (v) => {
					this.plugin.settings.showHash = v;
					this.plugin.saveSettings();
					this.display();
				})
			);

		// the preview showing if and how the hash will be
		// displayed
		let previewBlock = this.createExampleBlock(setting.descEl);
		let previewTagName = Object.keys(app.metadataCache.getTags())[0];
		let previewTag = previewBlock.createEl("a", {
			text: this.formatTagOnShowHash(previewTagName ? previewTagName : "#example/tag")
		});
		Object.assign(previewTag, {
			className: "tag"
		});
	}

	// el : HTMLElement - the container element that holds the settings items
	// ?focusId : string - the name of the tag item that requested a "diplay()"
	//                     update. (used so that we can have live previews of the
	//                     settings update as the user types)
	opTags(el, focusId) {

		let setting = new obsidian.Setting(el)
			.setName("Tags")
			.setDesc("List of tag parents for shortening in preview mode.");
		setting.descEl.createEl("div", {text:"Available wildcards:"});
		// rules
		let line1 = setting.descEl.createEl("div");
		Object.assign(line1,{ className: "snsvrno-tags-keyword-div"});
		Object.assign(line1.createEl("span", {text:"*"}), {
			className: "snsvrno-tags-keyword"
		});
		line1.createEl("span",{text:" matches all characters except for "});
		Object.assign(line1.createEl("span", {text:"/"}), {
			className: "snsvrno-tags-keyword"
		});

		// creates a new line for each user tag setting
		let vaultTags = Object.keys(app.metadataCache.getTags());
		this.plugin.settings.tags.forEach((tagDef) => {
			let index = this.plugin.settings.tags.indexOf(tagDef);

			let div = el.createDiv();
			let setting = new obsidian.Setting(div)
				.addText(txt => {
					txt.setValue(tagDef);
					txt.onChange(async (v) => {
						this.plugin.settings.tags[index] = v;
						this.plugin.saveSettings();
						this.display("tags_"+v);
						});
					// focus on this text box so we can continue to type
					// and update the previews
					if (focusId == "tags_"+tagDef) { txt.inputEl.focus(); }
					}
				)
				.addButton(btn => {
					btn.setButtonText("Remove");
					btn.setTooltip("Remove rule '" + tagDef + "'");
					btn.onClick(async (_) => {
						this.plugin.settings.tags.splice(index, 1);
						this.plugin.saveSettings();
						this.display();
					});
				});

			// building the preview for this definition
			let preview = this.createExampleBlock(setting.descEl);
			const tagDefReg = fn.makeReg(tagDef);
			// match them to the database
			let foundMatch = false;
			let matchCount = 0;
			for (let i = 0; i < vaultTags.length; i++) {
				if (vaultTags[i].match(tagDefReg)) {
					// this happens on the 2nd+ match so we can get the
					// counts but don't need to make the preview anymore
					if (foundMatch) matchCount += 1;
					else {
						//let newTag = fn.tagSplitShorten(defSections, vaultTags[i]);
						let newTag = vaultTags[i].replace(tagDefReg,"");
						this.createTagEl(preview, this.formatTagOnShowHash(vaultTags[i]));
						preview.createEl("span", { text: "=>" });
						this.createTagEl(preview,this.formatTagOnShowHash(newTag));
						foundMatch = true;
						matchCount = 1;
					}
				}
			}

			// if no tags exist, let the user know in the case there is a typo
			// or that no matches is unexpected.
			if (!foundMatch) {
				let msg = preview.createEl("span", {text:"No matching tags currently in vault."});
				Object.assign(msg, {className:"setting-item-description"});
			} else {
				let matchesEl = this
					.createExampleBlock(setting.descEl, "Unique tag matches:")
					.createEl("span", { text: matchCount })
				Object.assign(matchesEl, {className: "snsvrno-tags-matches-count"});
			}
		});

		// creates the "add" button at the end
		let div = el.createDiv();
		new obsidian.Setting(div)
			.addButton((btn) => {
				btn.setButtonText("Add");
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
	createExampleBlock(el, text) {
		let example = el.createEl("span");
		Object.assign(example, {
			className: "snsvrno-tags-example",
		});

		let exampletext = example.createEl("p", { text: text ? text : "Preview:" });
		Object.assign(exampletext, {
			className: "snsvrno-tags-example-text",
		});

		let examplecontainer = example.createEl("div");
		Object.assign(examplecontainer, {
			className: "snsvrno-tags-example-container",
		});

		return examplecontainer;
	}

	// creates the tag element with the correct classes
	createTagEl(el, text) {
		let tag = el.createEl("a", { text: text })
		Object.assign(tag, {
			className: "tag"
		});
		return tag;
	}


	// formats the tag based on the `ShowHash` setting
	// tagName : string - expecting something like `#example/tag`
	formatTagOnShowHash(tagName) {
		if (this.plugin.settings.showHash) {
			if (tagName.charAt(0) == "#") return tagName;
			else return "#" + tagName;
		} else {
			if (tagName.charAt(0) == "#") return tagName.substring(1);
			else return tagName;
		}
	}

}

///////////////////////////////////////////////////////////////////////

class fn {
	static makeReg(def) {
		if (def.substring(def.length-1,1) != "/") def = def += "/";
		let reg = new RegExp(def.replaceAll("*", "[^\/]*"))
		return reg;
	}
}

////////////////////////////////////////////////////////////

module.exports = SnsvrnoTagsPlugin
