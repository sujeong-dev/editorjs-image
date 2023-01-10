import {
  IconPicture,
  IconAlignLeft,
  IconAlignRight,
  IconAlignCenter,
  IconReplace,
  IconUndo,
} from '@codexteam/icons';
import { make } from './utils/dom';

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * @param {object} ui - image tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {ImageConfig} ui.config - user config
   * @param {Function} ui.onSelectFile - callback for clicks on Select file button
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({ api, config, onSelectFile, readOnly }) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.readOnly = readOnly;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      imageContainer: make('div', [this.CSS.imageContainer]),
      imageWidth: make(
        'div',
        [this.CSS.input, this.CSS.caption, this.CSS.setImage],
        {
          contentEditable: !this.readOnly,
        }
      ),
      imageHeight: make(
        'div',
        [this.CSS.input, this.CSS.caption, this.CSS.setImage],
        {
          contentEditable: !this.readOnly,
        }
      ),
      alignContainer: make('div', this.CSS.alignContainer),
      leftAlign: this.createLeftAlignButton(),
      centerAlign: this.createCenterAlignButton(),
      rightAlign: this.createRightAlignButton(),
      setSizeButton: this.createSetSizeButton(),
      resizeModeButton: this.createResizeModeButton(),
      undoResizeButton: this.createUndoResizeButton(),
      fileButton: this.createFileButton(),
      imageEl: undefined,
      imagePreloader: make('div', this.CSS.imagePreloader),
      caption: make('div', [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
      }),
    };
    this.konva = {};

    /**
     * Create base structure
     *  <wrapper>
     *    <image-container>
     *      <image-preloader />
     *    </image-container>
     *    <caption />
     *    <select-file-button />
     *  </wrapper>
     */
    this.nodes.caption.dataset.placeholder = this.config.captionPlaceholder;
    this.nodes.imageWidth.dataset.placeholder = this.config.widthPlaceholder;
    this.nodes.imageWidth.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });
    this.nodes.imageHeight.dataset.placeholder = this.config.heightPlaceholder;
    this.nodes.imageHeight.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });

    this.nodes.wrapper.appendChild(this.nodes.imagePreloader);
    this.nodes.wrapper.appendChild(this.nodes.imageContainer);
    this.nodes.wrapper.appendChild(this.nodes.alignContainer);
    this.nodes.alignContainer.appendChild(this.nodes.leftAlign);
    this.nodes.alignContainer.appendChild(this.nodes.centerAlign);
    this.nodes.alignContainer.appendChild(this.nodes.rightAlign);
    this.nodes.alignContainer.appendChild(this.nodes.imageWidth);
    this.nodes.alignContainer.appendChild(this.nodes.imageHeight);
    this.nodes.alignContainer.appendChild(this.nodes.setSizeButton);
    this.nodes.alignContainer.appendChild(this.nodes.undoResizeButton);
    this.nodes.alignContainer.appendChild(this.nodes.resizeModeButton);
    this.nodes.wrapper.appendChild(this.nodes.caption);
    this.nodes.wrapper.appendChild(this.nodes.fileButton);
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'image-tool',
      imageContainer: 'image-tool__image',
      imagePreloader: 'image-tool__image-preloader',
      imageEl: 'image-tool__image-picture',
      caption: 'image-tool__caption',
      setImage: 'image-tool__setImage',
      alignContainer: 'image-tool__alignContainer',
      leftAlign: 'image-tool__leftAlign',
      centerAlign: 'image-tool__centerAlign',
      rightAlign: 'image-tool__rightAlign',
      alignButton: 'image-tool__alignButton',
      setSizeBtn: 'image-tool__setSizeBtn',
      resizeModeButton: 'image-tool__resizeModeButton',
      undoResizeButton: 'image-tool__undoResizeButton',
    };
  }

  /**
   * Ui statuses:
   * - empty
   * - uploading
   * - filled
   *
   * @returns {{EMPTY: string, UPLOADING: string, FILLED: string}}
   */
  static get status() {
    return {
      EMPTY: 'empty',
      UPLOADING: 'loading',
      FILLED: 'filled',
    };
  }

  /**
   * Renders tool UI
   *
   * @param {ImageToolData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData) {
    if (!toolData.file || Object.keys(toolData.file).length === 0) {
      this.toggleStatus(Ui.status.EMPTY);
    } else {
      this.toggleStatus(Ui.status.UPLOADING);
    }

    return this.nodes.wrapper;
  }

  /**
   * Creates upload-file button
   *
   * @returns {Element}
   */
  createFileButton() {
    const button = make('div', [this.CSS.button]);

    button.innerHTML =
      this.config.buttonContent ||
      `${IconPicture} ${this.api.i18n.t('Select an Image')}`;

    button.addEventListener('click', () => {
      this.onSelectFile();
    });

    return button;
  }

  /**
   * Shows uploading preloader
   *
   * @param {string} src - preview source
   * @returns {void}
   */
  showPreloader(src) {
    this.nodes.imagePreloader.style.backgroundImage = `url(${src})`;

    this.toggleStatus(Ui.status.UPLOADING);
  }

  /**
   * Hide uploading preloader
   *
   * @returns {void}
   */
  hidePreloader() {
    this.nodes.imagePreloader.style.backgroundImage = '';
    this.toggleStatus(Ui.status.EMPTY);
  }

  /**
   * Shows an image
   *
   * @param {string} url - image source
   * @returns {void}
   */
  fillImage(url) {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = /\.mp4$/.test(url) ? 'VIDEO' : 'IMG';

    const attributes = {
      src: url,
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     *
     * @type {string}
     */
    let eventName = 'load';

    /**
     * Update attributes and eventName if source is a mp4 video
     */
    if (tag === 'VIDEO') {
      /**
       * Add attributes for playing muted mp4 as a gif
       *
       * @type {boolean}
       */
      attributes.autoplay = true;
      attributes.loop = true;
      attributes.muted = true;
      attributes.playsinline = true;

      /**
       * Change event to be listened
       *
       * @type {string}
       */
      eventName = 'loadeddata';
    }

    /**
     * Compose tag with defined attributes
     *
     * @type {Element}
     */
    this.nodes.imageEl = make(tag, this.CSS.imageEl, attributes);

    /**
     * Add load event listener
     */
    this.nodes.imageEl.addEventListener(eventName, () => {
      this.toggleStatus(Ui.status.FILLED);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.imagePreloader) {
        this.nodes.imagePreloader.style.backgroundImage = '';
      }
    });

    this.nodes.imageContainer.appendChild(this.nodes.imageEl);
  }

  /**
   * Make the image resizable
   *
   * @param {object} imageEl - image element
   */
  makeImageResizable(imageEl) {
    var stage = new Konva.Stage({
      container: this.nodes.imageContainer,
      width: 700,
      height: 410,
    });

    var layer = new Konva.Layer();
    stage.add(layer);

    var resizeImg = new Konva.Image({
      Width: this.config.konvaWidth,
      Height: this.config.konvaHeight,
    });
    resizeImg.image(imageEl);
    layer.add(resizeImg);

    var MAX_WIDTH = 700;
    var MAX_HEIGHT = 410;

    var tr = new Konva.Transformer({
      rotateEnabled: false,
      enabledAnchors: ['bottom-right'],
      boundBoxFunc: function (oldBoundBox, newBoundBox) {
        if (
          Math.abs(newBoundBox.width) > MAX_WIDTH ||
          Math.abs(newBoundBox.height) > MAX_HEIGHT
        ) {
          return oldBoundBox;
        }

        return newBoundBox;
      },
    });

    this.konva = {
      stage: stage,
      layer: layer,
      group: resizeImg,
    };

    layer.add(tr);
    tr.nodes([resizeImg]);
  }

  /**
   * Create align left set button
   *
   * @returns {Element}
   */
  createLeftAlignButton() {
    const button = make('button', [this.CSS.leftAlign, this.CSS.alignButton]);

    button.innerHTML = `${IconAlignLeft}`;
    button.addEventListener('click', () => {
      this.onSelectAlign('left');
    });

    return button;
  }

  /**
   * Create align center set button
   *
   * @returns {Element}
   */
  createCenterAlignButton() {
    const button = make('button', [this.CSS.centerAlign, this.CSS.alignButton]);

    button.innerHTML = `${IconAlignCenter}`;
    button.addEventListener('click', () => {
      this.onSelectAlign('center');
    });

    return button;
  }

  /**
   * Create align right set button
   *
   * @returns {Element}
   */
  createRightAlignButton() {
    const button = make('button', [this.CSS.rightAlign, this.CSS.alignButton]);

    button.innerHTML = `${IconAlignRight}`;
    button.addEventListener('click', () => {
      this.onSelectAlign('right');
    });

    return button;
  }

  /**
   *
   * @returns {boolean}
   */
  isToggle(align) {
    return !align;
  }

  /**
   * Show preloader and upload image by target url
   *
   *
   * @returns {void}
   */
  onSelectAlign(align) {
    this.config.isSelectedLeft =
      align === 'left' ? this.isToggle(this.config.isSelectedLeft) : false;
    this.config.isSelectedCenter =
      align === 'center' ? this.isToggle(this.config.isSelectedCenter) : false;
    this.config.isSelectedRight =
      align === 'right' ? this.isToggle(this.config.isSelectedRight) : false;
    this.applyTune('left', this.config.isSelectedLeft);
    this.applyTune('center', this.config.isSelectedCenter);
    this.applyTune('right', this.config.isSelectedRight);
    this.applyAlign();
  }

  createInputWidth() {
    const div = make(
      'div',
      [this.CSS.input, this.CSS.caption, this.CSS.setImage],
      {
        contentEditable: !this.readOnly,
      }
    );

    this.nodes.imageWidth.dataset.placeholder = this.config.widthPlaceholder;

    div.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });

    return div;
  }

  createInputHeight() {
    const div = make(
      'div',
      [this.CSS.input, this.CSS.caption, this.CSS.setImage],
      {
        contentEditable: !this.readOnly,
      }
    );

    this.nodes.imageHeight.dataset.placeholder = this.config.heightPlaceholder;

    div.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });

    return div;
  }

  /**
   * get width value entered or cotrolled by user
   *
   * @returns {String}
   */
  get getImageWidth() {
    return this.nodes.imageWidth.textContent;
  }

  /**
   * get height value entered or cotrolled by user
   *
   * @returns {String}
   */
  get getImageHeight() {
    return this.nodes.imageHeight.textContent;
  }

  /**
   * Set image width and height value
   *
   * @returns {Void}
   */
  onSetImageSize() {
    this.config.imageWidth =
      this.getImageWidth === '' ? 0 : Number(this.getImageWidth);
    this.config.imageHeight =
      this.getImageHeight === '' ? 0 : Number(this.getImageHeight);
    if (this.getImageWidth.length !== 0) {
      this.config.konvaWidth = Number(this.getImageWidth);
    }
    if (this.getImageHeight.length !== 0) {
      this.config.konvaHeight = Number(this.getImageHeight);
    }

    this.nodes.imageEl.style.width =
      this.getImageWidth === '' ? '' : this.getImageWidth + 'px';
    this.nodes.imageEl.style.height =
      this.getImageHeight === '' ? '' : this.getImageHeight + 'px';
  }

  /**
   * Create size set button
   *
   * @returns {Element}
   */
  createSetSizeButton() {
    const button = make('button', [this.CSS.setSizeBtn]);

    button.innerHTML = `${this.api.i18n.t('Resize Image')}`;

    button.addEventListener('click', () => {
      this.onSetImageSize();
    });

    return button;
  }

  createUndoResizeButton() {
    const button = make('button', [this.CSS.undoResizeButton]);

    button.innerHTML = `${IconUndo}`;
    button.disabled = true;

    button.addEventListener('click', () => {
      if (this.config.isChangeResizeMode) {
        this.config.isChangeResizeMode = !this.config.isChangeResizeMode;
        this.applyTune('resizeMode-on', this.config.isChangeResizeMode);
        this.nodes.undoResizeButton.disabled = !this.config.isChangeResizeMode;
        this.nodes.setSizeButton.disabled = this.config.isChangeResizeMode;
        this.nodes.imageWidth.contentEditable = !this.config.isChangeResizeMode;
        this.nodes.imageHeight.contentEditable =
          !this.config.isChangeResizeMode;
        this.konva.stage.content.remove();
        this.nodes.imageEl.style.cssText = ``;
        this.nodes.imageContainer.appendChild(this.nodes.imageEl);
      } else {
        this.nodes.undoResizeButton.disabled = this.config.isChangeResizeMode;
        this.applyTune('resizeMode-on', this.config.isChangeResizeMode);
      }
    });

    return button;
  }

  /**
   * Create size set button
   *
   * @returns {Element}
   */
  createResizeModeButton() {
    const button = make('button', [this.CSS.resizeModeButton]);

    button.innerHTML = `${IconReplace}`;

    button.addEventListener('click', () => {
      this.config.isChangeResizeMode = !this.config.isChangeResizeMode;
      this.applyTune('resizeMode-on', this.config.isChangeResizeMode);
      this.nodes.setSizeButton.disabled = this.config.isChangeResizeMode;
      this.nodes.imageWidth.contentEditable = !this.config.isChangeResizeMode;
      this.nodes.imageHeight.contentEditable = !this.config.isChangeResizeMode;
      if (this.config.isChangeResizeMode) {
        this.nodes.undoResizeButton.disabled = !this.config.isChangeResizeMode;
        this.makeImageResizable(this.nodes.imageEl);
      } else {
        this.nodes.undoResizeButton.disabled = !this.config.isChangeResizeMode;

        this.konva.stage.content.remove();
        this.config.konvaWidth =
          this.konva.group.parent.children[1].children[0].attrs.width;
        this.config.konvaHeight =
          this.konva.group.parent.children[1].children[0].attrs.height;
        this.nodes.imageEl.style.cssText = `width:${this.config.konvaWidth}px;height:${this.config.konvaHeight}px;`;
        this.nodes.imageContainer.appendChild(this.nodes.imageEl);

        this.nodes.imageWidth.innerText = parseInt(this.config.konvaWidth);
        this.nodes.imageHeight.innerText = parseInt(this.config.konvaHeight);
        this.config.imageWidth = parseInt(this.config.konvaWidth);
        this.config.imageHeight = parseInt(this.config.konvaHeight);
      }
    });

    return button;
  }

  /**
   * Shows caption input
   *
   * @param {string} text - caption text
   * @returns {void}
   */
  fillCaption(text) {
    if (this.nodes.caption) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Changes UI status
   *
   * @param {string} status - see {@link Ui.status} constants
   * @returns {void}
   */
  toggleStatus(status) {
    for (const statusType in Ui.status) {
      if (Object.prototype.hasOwnProperty.call(Ui.status, statusType)) {
        this.nodes.wrapper.classList.toggle(
          `${this.CSS.wrapper}--${Ui.status[statusType]}`,
          status === Ui.status[statusType]
        );
      }
    }
  }

  /**
   * Apply visual representation of activated tune
   *
   *  - one of available tunes {@link Tunes.tunes}
   * @param {boolean} status - true for enable, false for disable
   * @returns {void}
   */
  applyTune(tuneName, status) {
    this.nodes.wrapper.classList.toggle(
      `${this.CSS.wrapper}--${tuneName}`,
      status
    );
  }

  /**
   * Apply visual representation of activated tune
   *
   *  - one of available tunes {@link Tunes.tunes}
   *
   * @returns {void}
   */
  applyAlign() {
    this.nodes.leftAlign.classList.toggle(
      'image-tool__align-selected',
      this.config.isSelectedLeft
    );
    this.nodes.centerAlign.classList.toggle(
      'image-tool__align-selected',
      this.config.isSelectedCenter
    );
    this.nodes.rightAlign.classList.toggle(
      'image-tool__align-selected',
      this.config.isSelectedRight
    );
  }
}