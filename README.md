![](https://badgen.net/badge/Editor.js/v2.0/blue)

# Image Block

<img style="width:60%" src="https://user-images.githubusercontent.com/112826154/222068608-9ddb29de-c0fd-4eec-a0e5-0f67720b5103.png" />
<img style="width:30%" src="https://user-images.githubusercontent.com/112826154/222068680-c8c30108-9c7e-473b-9ba2-787b3dc24ff8.png" />


### 오픈소스 [Editor.js](https://editorjs.io)를 위한 [Image Block Tool](https://github.com/editor-js/image)

<br />

## 프로젝트 목적
메디스트림의 editor.js를 활용한 글쓰기 개발 중 이미지 편집을 제공하는 Image Block 플러그인의 추가 기능 개발

<br />

## 기존 기능

- 파일 업로드
- web으로부터 복사된 이미지 붙혀넣기
- drag-n-drop으로 이미지 붙혀넣기
- Clipboard에서 파일과 스크린샷 붙혀넣기
- 테두리, 배경 추가
- 스크린의 최대 가로길이까지 이미지 늘리기

## 내가 추가한 기능

- 업로드한 이미지 정렬 (왼쪽, 가운데, 오른쪽)
- 픽셀단위의 값을 입력하여 이미지 사이즈 조절
- 모서리 드래깅으로 사이즈 조절
- 정렬형태, 이미지 width, height값 data json형태로 저장

<br />

## 설치 및 실행

1. $ npm run build 하여 /dist/bundle.js 생성
2. $ node dev/server.js 로컬서버 실행 [requires Node.js 10.0.0+ and npm install]
3. 추가된 /dist/example.html 생성 후 코드 추가
```html
<script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest"></script>
<script src="bundle.js"></script>
<!-- <link href="simple-image.css" rel="stylesheet" /> -->

<div id="editorjs"></div>

<button id="save-button">Save</button>
<pre id="output"></pre>

<script>
  const editor = new EditorJS({
    autofocus: true,
    tools: {
      image: {
        // you'll see an Inline Toolbar with all available inline Tools.
        class: ImageTool,
        config: {
          endpoints: {
            byFile: "http://localhost:8008/uploadFile", // Your backend file uploader endpoint
            byUrl: "http://localhost:8008/fetchUrl", // Your endpoint that provides uploading by Url
          },
        },
      },
    },
    data: {
      time: 1552744582955,
      blocks: [
        {
          type: "image",
          data: {
            file: {
              url: "https://www.tesla.com/tesla_theme/assets/img/_vehicle_redesign/roadster_and_semi/roadster/hero.jpg",
            },
            caption: "Roadster // tesla.com",
            withBorder: false,
            withBackground: false,
            stretched: false,
          },
        },
      ],
      version: "2.11.10",
    },
  });

  const saveButton = document.getElementById("save-button");
  const output = document.getElementById("output");

  saveButton.addEventListener("click", () => {
    editor.save().then((savedData) => {
      output.innerHTML = JSON.stringify(savedData, null, 4);
    });
  });
</script>

```

<br />

## Demo
https://vimeo.com/793277250

<br />

## Output data

This Tool returns `data` with following format

| Field          | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| file           | `object`  | Uploaded file data. Any data got from backend uploader. Always contain the `url` property |
| caption        | `string`  | image's caption                 |
| withBorder     | `boolean` | add border to image             |
| withBackground | `boolean` | need to add background          |
| stretched      | `boolean` | stretch image to screen's width |
| alignment      | `string`  | stretch image to screen's width |
| width          | `number`  | stretch image to screen's width |
| height         | `number`  | stretch image to screen's width |


```json
{
    "type" : "image",
    "data" : {
        "file": {
            "url" : "https://www.tesla.com/tesla_theme/assets/img/_vehicle_redesign/roadster_and_semi/roadster/hero.jpg"
        },
        "caption" : "Roadster // tesla.com",
        "withBorder" : false,
        "withBackground" : false,
        "stretched" : true,
        "alignment" : "left",
        "width": 302,
        "height": 151
    }
}
```
