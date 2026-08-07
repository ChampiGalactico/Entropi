use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn finish_splashscreen(app: tauri::AppHandle) {
    // Reveal the application before removing its always-on-top startup window.
    if let Some(main_window) = app.get_webview_window("main") {
        if main_window.show().is_ok() {
            let _ = main_window.set_focus();

            if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                let _ = splashscreen.close();
            }
        }
    }
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../../src/db/schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_defaults",
            sql: include_str!("../../src/db/migrations/0002_seed_defaults.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "app_settings",
            sql: include_str!("../../src/db/migrations/0003_app_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "lookup_icons",
            sql: include_str!("../../src/db/migrations/0004_lookup_icons.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "professors",
            sql: include_str!("../../src/db/migrations/0005_professors.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "note_links",
            sql: include_str!("../../src/db/migrations/0006_note_links.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "teaching_roles",
            sql: include_str!("../../src/db/migrations/0007_teaching_roles.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "learning_topic_workflow",
            sql: include_str!("../../src/db/migrations/0008_learning_topic_workflow.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "flat_grade_entries",
            sql: include_str!("../../src/db/migrations/0009_flat_grade_entries.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "recursive_grade_components",
            sql: include_str!("../../src/db/migrations/0010_recursive_grade_components.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "recurring_tasks",
            sql: include_str!("../../src/db/migrations/0011_recurring_tasks.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    None,
                ))?;
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:entropi.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![finish_splashscreen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
