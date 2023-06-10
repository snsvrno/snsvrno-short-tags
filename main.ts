import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// SETTINGS ///////////////////////////

interface SnsvrnoTagsSettings {
	tags: Array<string>;
	showHash: boolean;
	showOneWord: boolean;
}

const DEFAULT_SETTINGS: SnsvrnoTagsSettings = {
	tags: [ ],
	showHash: true,
	showOneWord: true,
}

// PLUGINS //////////////////////////////

export default class SnsvrnoTags extends Plugin {
	settings: SnsvrnoTagsSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SnsvrnoTagsSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		/*this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});*/

	 // checks every tag and runs the formatter on it
	 this.registerMarkdownPostProcessor((element) => {
			element.querySelectorAll("a.tag").forEach((a) => this.formatTag(a));
	 });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * checks if the tag fits any of the defined shortening requirements
	 * and then shortens it
	 */
	formatTag(element : any) {

		var name = element.text;
		if (name.substring(0,1) == "#") name = name.substring(1);

		// works through the list of tags
		for (var i = 0; i < this.settings.tags.length; i++) {
			var tag = this.settings.tags[i];
			if (name.length >= tag.length && name.substring(0,tag.length) == tag) {

				// if we have the same tag but we set the option to trucate it.
				if (name == tag && this.settings.showOneWord) {
					var parts = name.split("/");
					name = parts.pop();
				}
				// if this is the same tag, we will not remove it
				else if (name == tag) break;
				// otherwise we trim it
				else {
					var pos = tag.length;
					// checking if the setting ended in "/", because otherwise
					// we need to add 1 in order to remove it.
					if (tag.substring(tag.length-1,1) != "/") pos += 1;
					name = name.substring(pos);
				}
			}
		}
	
		// adds back the hash if the settings ask for it.
		if (this.settings.showHash) name = "#" + name;

		element.dataset.uri = `obsidian://search?query=tag:${encodeURIComponent(element.text)}`;
		element.text = name;
		element.target = "_blank";
		element.rel = "noopener";
    element.onclick = () => window.open(element.dataset.uri);
	}
}

// SETTINGS TAB ////////////////////////

class SnsvrnoTagsSettingTab extends PluginSettingTab {
	plugin: SnsvrnoTags;

	constructor(app: App, plugin: SnsvrnoTags) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'General Settings'});

		new Setting(containerEl)
			.setName('Show Hash')
			.setDesc('Show the hash/pound for tags when in reading mode.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showHash)
					.onChange(async (value) => {
						this.plugin.settings.showHash = value;
						this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('Trim One Word on Matching')
			.setDesc('If the short tag name is the same as the tag being use, truncate the tag and only show the last tag. If disabled the entire tag will be shown.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showOneWord)
					.onChange(async (value) => {
						this.plugin.settings.showOneWord = value;
						this.plugin.saveSettings();
					}));

		/////////////////////////////////////////////

		new Setting(containerEl)
			.setName('Tags')
			.setDesc('List of full tag parents that will be shortened / hidden in reading mode.');

		this.plugin.settings.tags.forEach((t) => {
			var index = this.plugin.settings.tags.indexOf(t);
			new Setting(containerEl)
				.addText(text =>
					text.setValue(t)
						.onChange(async (v) => {
							this.plugin.settings.tags[index] = v;
							this.plugin.saveSettings();
						}))
				.addButton((b) => {
					b.setButtonText("Remove");
					b.setTooltip("Remove Tag '" + t + "'");
					b.onClick(async (_) => {
						this.plugin.settings.tags.splice(index,1);
						this.display();
					});
				});
		});

		new Setting(containerEl)
			.addButton((b) => {
				b.setButtonText("Add");
				b.setTooltip("Add new tag");
				b.onClick(async (_) => {
					this.plugin.settings.tags.push("tag/parents/here");
					this.display();
				});
			});
	}
}
