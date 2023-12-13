use crate::models::package_manager::PackageManager;

use crate::package_managers::default::default as default_package_manager;
use clap::arg;

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
    println!("{:?}", arr);
    Some((String::from(""), vec![]))
}

fn uninstall(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("{:?}", arr);
    Some((String::from(""), vec![]))
}

pub fn default() -> PackageManager {
    PackageManager {
        install_command,
        uninstall_command,
        name: String::from("pacman"),
        packages: vec![],
        ..default_package_manager()
    }
}
