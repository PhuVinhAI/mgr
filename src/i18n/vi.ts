import type { Messages } from "./types.js";

export const vi: Messages = {
  cli: {
    tagline: "Markdown Game Runtime — Compiler cho Prompt Programming",
    usage: "Cách dùng",
    commands: "Lệnh",
    cmdInit: "Tạo project MGR mới trong thư mục hiện tại",
    cmdBuild: "Biên dịch project thành một Prompt Specification",
    cmdValidate: "Kiểm tra project mà không sinh output",
    cmdDoctor: "Báo cáo tình trạng môi trường và project",
    options: "Tuỳ chọn",
    optLang: "Ngôn ngữ: en | vi (mặc định: tự động)",
    optHelp: "Hiển thị trợ giúp",
    optVersion: "Hiển thị phiên bản",
    unknownCommand: "Không rõ lệnh: {name}",
    meowHelp: `
    Cách dùng: mgr <lệnh> [tuỳ chọn]

    Lệnh:
      init       Tạo project MGR mới
      build      Biên dịch thành một Prompt Specification
      validate   Kiểm tra mà không sinh output
      doctor     Báo cáo môi trường và tình trạng project

    Tuỳ chọn:
      --lang <en|vi>   Ngôn ngữ (mặc định: tự động)
      --help, -h       Hiển thị trợ giúp
      --version, -v    Hiển thị phiên bản
  `,
  },
  steps: {
    "load-project": "Nạp project",
    parse: "Phân tích nguồn",
    validate: "Kiểm tra",
    bundle: "Ghép bundle",
    optimize: "Tối ưu",
    write: "Ghi output",
  },
  stepDetail: {
    loadProject: "Đang nạp mgr.config.json",
    parseEntry: "Đang phân tích entry {entry}",
    parsedFiles: "Đã phân tích {count} file",
    validateOk: "không có vấn đề",
    validateFail: "{count} lỗi",
    bundleMerged: "Đã ghép {count} file",
    writeTo: "{path}",
    tokens: "Đang đếm token ({chars} ký tự)",
    tokensSummary:
      "OpenAI: {openai} \u00b7 Anthropic: {anthropic} \u00b7 Gemini: {gemini}",
  },
  init: {
    creating: "Đang tạo file project trong {dir}",
    exists: "File đã tồn tại, bỏ qua: {path}",
    created: "đã tạo",
    skipped: "bỏ qua",
    done: "Đã khởi tạo project.",
    nextSteps: "Bước tiếp theo:",
    nextBuild: "  mgr build     # biên dịch ra dist/<tên>-<phiên bản>.md",
    nextValidate: "  mgr validate  # kiểm tra project mà không ghi output",
  },
  build: {
    starting: "Đang biên dịch project",
    success: "Build thành công.",
    failed: "Build thất bại.",
    output: "Đầu ra: {path}",
    duration: "Thời gian: {ms} ms",
    files: "Số file: {count}",
  },
  validate: {
    starting: "Đang kiểm tra project",
    ok: "Project hợp lệ.",
    failed: "Project không hợp lệ.",
    errorsFound: "Phát hiện {count} lỗi",
  },
  doctor: {
    starting: "Đang chẩn đoán",
    node: "Node.js: {version}",
    platform: "Hệ điều hành: {name}",
    cwd: "Thư mục làm việc: {path}",
    projectFound: "Đã phát hiện project: mgr.config.json ✓",
    projectMissing: "Không có mgr.config.json trong thư mục hiện tại",
    ok: "Mọi thứ đều ổn.",
    issues: "Phát hiện {count} vấn đề",
  },
  errors: {
    header: "Lỗi",
    file: "File",
    line: "Dòng",
    directive: "Directive",
    suggestion: "Gợi ý",
    unexpected: "Lỗi không mong đợi",
    didYouMean: "Có phải bạn muốn @{name} ?",
    byCode: {
      PROJECT_NOT_FOUND: {
        message: "Không đọc được mgr.config.json tại {path}",
        suggestion: "Chạy `mgr init` để tạo project mới tại đây.",
      },
      CONFIG_INVALID: {
        message: "mgr.config.json không hợp lệ",
        suggestion: "Sửa các trường được đánh dấu trong thông báo lỗi.",
      },
      FILE_NOT_FOUND: {
        message: "Không tìm thấy {label}: {path}",
        suggestion: "Tạo file, hoặc đặt lại `entry` trong mgr.config.json.",
      },
      READ_FAILED: {
        message: "Không đọc được file nguồn",
        suggestion: "Kiểm tra đường dẫn và quyền truy cập file.",
      },
      UNKNOWN_DIRECTIVE: {
        message: "Directive không xác định: @{name}",
        suggestion: "Có phải bạn muốn @{hint} ?",
      },
      DIRECTIVE_RESERVED: {
        message: "Directive @{name} đã được giữ chỗ, chưa được phép dùng",
        suggestion:
          "Tên này được MGR dành riêng cho bản phát hành sau. Hãy chọn tên khác, hoặc đợi PRD định nghĩa nó.",
      },
      DIRECTIVE_SYNTAX_SECTION_MISSING_ID: {
        message: "Directive @section yêu cầu id",
        suggestion: "Viết `@section <id>` (ví dụ `@section intro`).",
      },
      DIRECTIVE_SYNTAX_SECTION_INVALID_ID: {
        message: "Section id không hợp lệ: \"{id}\"",
        suggestion: "Chỉ dùng chữ, số, dấu gạch, gạch dưới hoặc dấu chấm.",
      },
      DIRECTIVE_SYNTAX_IMPORT_MISSING_PATH: {
        message: "Directive @import yêu cầu đường dẫn",
        suggestion: "Viết `@import <đường-dẫn>` (ví dụ `@import intro.md`).",
      },
      DIRECTIVE_SYNTAX_DECLARATION_MISSING_NAME: {
        message: "Directive @{kind} yêu cầu tên declaration",
        suggestion:
          "Viết `@{kind} <Tên>` (ví dụ `@{kind} Money`). Tên phải bắt đầu bằng chữ hoa.",
      },
      DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME: {
        message: "Tên declaration {kind} không hợp lệ: \"{name}\"",
        suggestion:
          "Dùng các từ Title-Case cách nhau bởi một dấu cách (ví dụ `Weather Roll`, `Auto Action End Day`).",
      },
      IMPORT_NOT_FOUND: {
        message: "Không tìm thấy đích của @import: {path}",
        suggestion:
          "Kiểm tra đường dẫn. Đường dẫn được giải quyết tương đối với file hiện tại, hoặc theo srcDir nếu bắt đầu bằng `/`.",
      },
      IMPORT_NOT_A_FILE: {
        message: "Đích của @import không phải file: {path}",
        suggestion: "@import phải trỏ tới một file Markdown (.md).",
      },
      IMPORT_OUTSIDE_SRC: {
        message: "@import vượt ra ngoài srcDir: {path}",
        suggestion:
          "Mọi @import phải nằm trong srcDir. Dùng đường dẫn tương đối, hoặc tiền tố `/` để tính từ gốc srcDir.",
      },
      DUPLICATE_SECTION: {
        message: "Trùng section id \"{id}\"",
        suggestion: "Đổi tên section này. Khai báo lần đầu tại {origin}.",
      },
      DEPENDENCY_CYCLE: {
        message: "Phát hiện vòng lặp phụ thuộc: {chain}",
        suggestion: "Bỏ một cạnh @import ở trên để phá vòng lặp.",
      },
      EMPTY_PROJECT: {
        message: "Project không có nội dung để bundle",
        suggestion: "Thêm nội dung Markdown hoặc `@section` vào file entry.",
      },
      WRITE_FAILED: {
        message: "Không ghi được file output",
        suggestion: "Kiểm tra đường dẫn outDir và quyền ghi file.",
      },
      RUNTIME_INCOMPATIBLE: {
        message:
          "Game Package yêu cầu Runtime {target}, nhưng compiler đang có Runtime {actual}",
        suggestion:
          "Sửa `runtime` trong mgr.config.json thành mục tiêu tương thích (ví dụ `{actualMajor}.x`), hoặc cài đặt compiler khớp với package.",
      },
      SECTION_SCHEMA_MISSING_BLOCK: {
        message:
          "{kind} \"{name}\" thiếu block bắt buộc \"{block}\"",
        suggestion:
          "Thêm block `{block}:` bên dưới `{kind} {name}`. Xem PRD-008 §15a.",
      },
      SECTION_SCHEMA_FORBIDDEN_BLOCK: {
        message:
          "{kind} \"{name}\" (Kind: {subKind}) không được khai báo block \"{block}\"",
        suggestion:
          "Xoá `{block}:` khỏi declaration, hoặc đổi Kind. Xem PRD-008 §15a.4.",
      },
      SECTION_SCHEMA_UNKNOWN_BLOCK: {
        message:
          "Block không nhận diện: \"{block}\" trong {kind} \"{name}\"",
        suggestion:
          "Tên block phải nằm trong PRD-008 §15a. Kiểm tra chính tả, hoặc chuyển nội dung vào `Behaviour:`.",
      },
      SECTION_SCHEMA_DUPLICATE_BLOCK: {
        message:
          "Block \"{block}\" khai báo hai lần trong {kind} \"{name}\"",
        suggestion:
          "Gộp hai block `{block}:` lại. Mỗi block chỉ được khai báo một lần.",
      },
      SECTION_SCHEMA_MISSING_KIND: {
        message:
          "{kind} \"{name}\" thiếu block `Kind:` bắt buộc",
        suggestion:
          "Khai báo `Kind:` rõ ràng (Guard | Transformation | Trigger cho Rule, Persistent | Transient cho Entity). Xem PRD-008 §15a.",
      },
      DOCUMENTATION_PURPOSE_MISSING: {
        message:
          "{kind} \"{name}\" thiếu block `Purpose:` bắt buộc",
        suggestion:
          "Thêm `Purpose:` với 1–3 câu giải thích tại sao {kind} này tồn tại. Xem PRD-014 §6.",
      },
      DOCUMENTATION_FAILURE_MISSING: {
        message:
          "{kind} \"{name}\" nên có block `Failure:`",
        suggestion:
          "Thêm `Failure:` mô tả điều gì xảy ra khi Precondition không đạt. Xem PRD-014 §7.",
      },
      DOCUMENTATION_BLOCK_EMPTY: {
        message:
          "{kind} \"{name}\" có block `{block}:` rỗng",
        suggestion:
          "Điền nội dung block hoặc xóa heading. Xem PRD-014.",
      },
      DOCUMENTATION_PURPOSE_TAUTOLOGY: {
        message:
          "Purpose của {kind} \"{name}\" chỉ lặp lại tên",
        suggestion:
          "Purpose phải giải thích ý định, không nhắc lại tên declaration. Xem PRD-014 §6.",
      },
      FORMULA_BODY_INVALID: {
        message:
          "Body của Formula \"{name}\" không phải expression",
        suggestion:
          "Body Formula phải là expression theo PRD-009 §18a — dòng đơn, Piecewise (When/Then/Otherwise), Named Formula reference, hoặc Bounded expression. Cấm văn xuôi.",
      },
      INTERNAL: {
        message: "Lỗi nội bộ của compiler",
        suggestion: "Vui lòng báo cáo kèm theo nguồn gây lỗi.",
      },
    },
  },
  common: {
    yes: "có",
    no: "không",
    cancel: "huỷ",
  },
};
