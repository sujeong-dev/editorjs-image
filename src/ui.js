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
      inputWidth: make(
        'input',
        [this.CSS.input, this.CSS.caption, this.CSS.setImage],
        {
          contentEditable: !this.readOnly,
        }
      ),
      inputHeight: make(
        'input',
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
    this.nodes.inputWidth.placeholder = this.config.width || this.config.widthPlaceholder;
    this.nodes.inputWidth.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
       this.nodes.inputWidth.placeholder = this.nodes.imageEl.style.width;
      }
    });
    this.nodes.inputHeight.placeholder =this.config.height || this.config.heightPlaceholder;
    this.nodes.inputHeight.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
        this.nodes.inputHeight.placeholder = this.nodes.imageEl.style.height;

      }
    });

    this.nodes.wrapper.appendChild(this.nodes.imagePreloader);
    this.nodes.wrapper.appendChild(this.nodes.imageContainer);
    this.nodes.wrapper.appendChild(this.nodes.alignContainer);
    this.nodes.alignContainer.appendChild(this.nodes.leftAlign);
    this.nodes.alignContainer.appendChild(this.nodes.centerAlign);
    this.nodes.alignContainer.appendChild(this.nodes.rightAlign);
    this.nodes.alignContainer.appendChild(this.nodes.inputWidth);
    this.nodes.alignContainer.appendChild(this.nodes.inputHeight);
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
      this.nodes.imageEl.style.width = this.config.width;
      this.nodes.imageEl.style.height = this.config.height;
      

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
    const input = make(
      'input',
      [this.CSS.input, this.CSS.caption, this.CSS.setImage],
      {
        contentEditable: !this.readOnly,
      }
    );

    this.nodes.inputWidth.placeholder = this.config.widthPlaceholder;


    input.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });

    return input;
  }

  createInputHeight() {
    const input = make(
      'input',
      [this.CSS.input, this.CSS.caption, this.CSS.setImage],
      {
        contentEditable: !this.readOnly,
      }
    );

    this.nodes.inputHeight.placeholder = this.config.heightPlaceholder;

    input.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        this.onSetImageSize();
      }
    });

    return input;
  }

  /**
   * get width value entered or cotrolled by user
   *
   * @returns {String}
   */
  get getInputWidth() {
    return this.nodes.inputWidth.value;
  }

  /**
   * get height value entered or cotrolled by user
   *
   * @returns {String}
   */
  get getInputHeight() {
    return this.nodes.inputHeight.value;
  }


    
  makeImageResizable(imageEl) {
    var imgWidth = this.nodes.imageEl.width;
    var imgHeight = this.nodes.imageEl.height;
   
    var canvasWidth = this.config.konvaWidth;
    var canvasHeight = imgHeight / imgWidth * canvasWidth;

    var stage = new Konva.Stage({
      container: this.nodes.imageContainer,
      width: canvasWidth,
      height: canvasHeight,
     
    });
  
    var layer = new Konva.Layer();
    stage.add(layer); 
    

    var resizeImg = new Konva.Image({
      width : this.config.width,
      height : this.config.height,
      draggable: true
    });
    resizeImg.image(imageEl);
    layer.add(resizeImg);


    var tr = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
      boundBoxFunc: function (oldBoundBox, newBoundBox) {

        if (
          Math.abs(newBoundBox.width) > canvasWidth ||
          Math.abs(newBoundBox.height) > canvasHeight
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
   * Set image width and height value
   *
   * @returns {Void}
   */
  onSetImageSize() {

    let currentInputWidth = Number(this.nodes.inputWidth.value);
    let currentInputHeight = Number(this.nodes.inputHeight.value);



    if (this.nodes.inputWidth.value) {
      if (this.nodes.inputHeight.value) {
        // width O height O
        this.nodes.imageEl.style.width = currentInputWidth;
        this.nodes.imageEl.style.height = currentInputHeight;
      } else {
        const prevHeight = this.nodes.imageEl.style.height;
        // width O height X
        this.nodes.imageEl.style.width = currentInputWidth;
        this.nodes.imageEl.style.height = prevHeight;
      }
    } else {
      if (this.nodes.inputHeight.value) {
        // width X height O
        const prevWidth = this.nodes.imageEl.style.width;
        // width O height X
        this.nodes.imageEl.style.width = prevWidth;
        this.nodes.imageEl.style.height = currentInputHeight;
      } 
    }
    // this.config.inputWidth =
    //   this.getInputWidth === '' ? 0 : Number(this.getInputWidth);
    // this.config.inputHeight =
    //   this.getInputHeight === '' ? 0 : Number(this.getInputHeight);
    // if (this.getInputWidth.length !== 0) {
    //   this.config.konvaWidth = Number(this.getInputWidth);
    // }
    // if (this.getInputHeight.length !== 0) {
    //   this.config.konvaHeight = Number(this.getInputHeight);
    // }

    // this.nodes.imageEl.style.width =
    //   this.getInputWidth === '' ? '' : this.getInputWidth + 'px';
    // this.nodes.imageEl.style.height =
    //   this.getInputHeight === '' ? '' : this.getInputHeight + 'px';
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
      this.nodes.inputWidth.placeholder = this.nodes.imageEl.style.width;
      this.nodes.inputHeight.placeholder = this.nodes.imageEl.style.height;
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
        this.nodes.inputWidth.contentEditable = !this.config.isChangeResizeMode;
        this.nodes.inputHeight.contentEditable =
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
      this.nodes.inputWidth.contentEditable = !this.config.isChangeResizeMode;
      this.nodes.inputHeight.contentEditable = !this.config.isChangeResizeMode;

      if (this.config.isChangeResizeMode) {
           this.nodes.imageContainer.style.backgroundImage = `url('https://cdn.pixabay.com/photo/2016/07/29/23/03/white-1556097_1280.png')`;
          this.makeImageResizable(this.nodes.imageEl);
          this.nodes.undoResizeButton.style.visibility = 'hidden'
      } else {
        this.konva.stage.content.remove();
        this.nodes.imageContainer.style.backgroundImage = ''
        this.nodes.undoResizeButton.style.visibility = 'visible'
        this.nodes.undoResizeButton.disabled = false;
  
      
        this.config.width =
          this.konva.group.parent.children[1].children[0].attrs.width;
          this.config.height =
          this.konva.group.parent.children[1].children[0].attrs.height;
          this.nodes.imageEl.style.cssText = `width:${this.config.width}px;height:${this.config.height}px;`;
        this.nodes.imageContainer.appendChild(this.nodes.imageEl);
        this.nodes.inputHeight.placeholder = `${parseInt(this.config.height)} px`;
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
