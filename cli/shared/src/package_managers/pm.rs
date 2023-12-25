use crate::models::package_manager::PackageManager;

use crate::package_managers::default::default as default_package_manager;
use clap::arg;
use crate::utils::run_command;

fn install_command() -> clap::Command {
    clap::Command::new("package").arg(
        arg!(-S <PACKAGES> ... "install a package")
            .num_args(1..)
            .id("install")
            .action(clap::ArgAction::Append),
    )
}

fn uninstall_command() -> clap::Command {
    clap::Command::new("package").arg(
        arg!(-R <PACKAGES> ... "uninstall a package")
            .num_args(1..)
            .id("uninstall")
            .action(clap::ArgAction::Append),
    )
}

fn install(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("");
    println!("running install command");
    let _  = run_command(&["pacman".to_string(), "-S".to_string(), arr[1].clone()].to_vec());
    Some((String::from(""), vec![]))
}

fn uninstall(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("");
    println!("running install command");
    let _  = run_command(&["pacman".to_string(), "-R".to_string(), arr[1].clone()].to_vec());
    Some((String::from(""), vec![]))
}

pub fn default() -> PackageManager {
    PackageManager {
        install,
        uninstall,
        install_command,
        uninstall_command,
        name: String::from("pacman"),
        packages: vec![],
        ..default_package_manager()
    }
}
