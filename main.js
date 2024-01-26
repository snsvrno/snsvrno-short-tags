var obsidian = require('obsidian');

var DEFAULT_SETTINGS = {
	showHash: true,
	tags: []
};

//////////////////////////////////////////////////////////////

class SnsvrnoTagsPlugin extends obsidian.Plugin {
	async onload() {
		console.log("loaded the plugin");

		await this.loadSettings();
		this.addSettingTab(new SnsvrnoTagsSettingsTab(this.app, this));

		this.registerMarkdownPostProcessor((e) => {
			e.querySelectorAll("a.tag").forEach((a) => this.formatTag(a));
		});
	}

	onunload() {
		console.log("unloaded the plugin");
	}

	///////

	async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
    await this.saveData(this.settings);
	}

	/////
	formatTag(el) {
		///////////////////////////////////
		// double checks that these are tags, will not
		// continue processing if its not
		if (el.text.substring(0,1) != "#") return;

		/////////////////////////////////
		// processing the tags
		for (var i = 0; i < this.settings.tags.length; i++) {
			var reftag = this.settings.tags[i].substring(1).split("/");

			if (fn.tagSplitMatch(reftag,el.text)) {
				el.text = fn.tagSplitShorten(reftag, el.text);
				break;
			}

/*
			if (reftag.length + 1 < el.text.length
			&& el.text.substring(1, reftag.length + 1) == reftag) {
				// +2 because accounting for the # and the /
				el.text = el.text.substring(reftag.length+2);
				break; // because we will only match with one
			}
*/
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
		var el = this.containerEl;
		el.empty();

		this.opShowHash(el);
		this.opTags(el, focusId);
	}

	////////////////////////////////////
	opShowHash(el) {
		var exampleTag;

		// used so that we can update the example when the options are changed
		// [todo) clean this up because now we update the whole display
		// and don't use this anymore
		var updateShowHashExamples = () => {
			exampleTag.text = (this.plugin.settings.showHash ? "#" : "") + "nested/tag";
		}

		var showHashOption = new obsidian.Setting(el)
			.setName("Show Hash")
			.setDesc("Show the '#' for tags in preview")
			.addToggle(t => t
				.setValue(this.plugin.settings.showHash)
				.onChange(async (v) => {
					this.plugin.settings.showHash = v;
					this.plugin.saveSettings();
					this.display();
				})
			);

		// the example preview
		var example = this.createExampleBlock(el);
		var exampleTag = example.createEl("a")
		Object.assign(exampleTag, {
			className: "tag"
		});

		updateShowHashExamples();
	}

	////////////////////////////////////
	opTags(el, focusId) {

		var option = new obsidian.Setting(el)
			.setName("Tags")
			.setDesc("List of tag parents for shortening in preview mode.");

		// creates a new line for each user tag setting
		var tags = Object.keys(app.metadataCache.getTags());
		this.plugin.settings.tags.forEach((tag) => {
			var index = this.plugin.settings.tags.indexOf(tag);

			var div = el.createDiv();
			var setting = new obsidian.Setting(div)
				.addText(txt => {
					txt.setValue(tag);
					txt.onChange(async (v) => {
						this.plugin.settings.tags[index] = v;
						this.plugin.saveSettings();
						this.display("tags_"+v);
						});
					// focus on this text box so we can continue to type
					// and update the previews
					if (focusId == "tags_"+tag) { txt.inputEl.focus(); }
					}
				)
				.addButton(btn => {
					btn.setButtonText("Remove");
					btn.setTooltip("Remove rule '" + tag + "'");
					btn.onClick(async (_) => {
						this.plugin.settings.tags.splice(index, 1);
						this.plugin.saveSettings();
						this.display();
					});
				});

			var preview = this.createExampleBlock(setting.infoEl);
			// figure out the tags
			var split;
			if (tag.substring(0,1) == "#") split = tag.substring(1).split("/");
			else split = tag.split("/");
			// get rid of the "" at the end if they write "#tag/"
			if (split[split.length-1] == "") split.pop();
			// match them to the database
			var foundMatch = false;
			for (var i = 0; i < tags.length; i++) {
				if (fn.tagSplitMatch(split, tags[i])) {
					var newTag = fn.tagSplitShorten(split, tags[i]);
					this.createTagEl(preview, this.formatTagForPreview(tags[i]));
					preview.createEl("span", { text: "=>" });
					this.createTagEl(preview,this.formatTagForPreview(newTag));
					foundMatch = true;
					break;
				}
			}

			if (!foundMatch) {
				var msg = preview.createEl("span", {text:"No matching tags currently in vault."});
				Object.assign(msg, {className:"setting-item-description"});
			}
		});

		// creates the "add" button at the end
		var div = el.createDiv();
		new obsidian.Setting(div)
			.addButton((btn) => {
				btn.setButtonText("Add");
				btn.setTooltip("Add another matching expression");
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
	createExampleBlock(el) {
		var example = el.createEl("span");
		Object.assign(example, {
			className: "snsvrno-tags-example",
		});

		var exampletext = example.createEl("p", { text: "Preview:" });
		Object.assign(exampletext, {
			className: "snsvrno-tags-example-text",
		});

		var examplecontainer = example.createEl("span");
		Object.assign(examplecontainer, {
			className: "snsvrno-tags-example-container",
		});

		return examplecontainer;
	}

	createTagEl(el, text) {
		var tag = el.createEl("a", { text: text })
		Object.assign(tag, {
			className: "tag"
		});
		return tag;
	}

	/**
	 * will strip off the # if that option in enabled
	 */
	formatTagForPreview(tagName) {
		if (!this.plugin.settings.showHash) return tagName.substring(1);
		else return tagName;
	}



}

///////////////////////////////////////////////////////////////////////

class fn {
	/**
	 * will return boolean based on if we match or not
	 * seach : Array<string> - the tag shorten prefix
	 * tag : string - the tag to shorten
	 */
	static tagSplitMatch(search, tag) {
		// removes the "#" and then splits by "/"
		var split = tag.substring(1).split("/");

		if (search.length > split.length) return false;

		var j = 0;
		var found = true;

		while (j < split.length && j < search.length) {
			if (split[j] != search[j]) {
				found = false;
			}
			j += 1;
		}

		if (found && split.length != search.length) return true
		else return false;
	}

	/**
	 * !! DOES NOT CHECK ANYTHING !!
	 * will return the shortened tag name with "#"
	 * seach : Array<string> - the tag shorten prefix
	 * tag : string - the tag to shorten
	 */
	static tagSplitShorten(search, tag) {
		console.log(search);
		console.log(tag);
		var newTag = tag.split("/").slice(search.length).join("/");
		return "#" + newTag;
	}
}

////////////////////////////////////////////////////////////

module.exports = SnsvrnoTagsPlugin
