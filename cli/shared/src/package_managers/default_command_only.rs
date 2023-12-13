use crate::models::package_manager::PackageManager;
use crate::package_managers::default::default as default_package_manager;
use clap::arg;

pub fn install_command() -> clap::Command {
    clap::Command::new("package").subcommand(
        clap::Command::new("install").args(&[arg!([NAME] ...).id("install").short('y')]),
    )
    //.subcommand(clap::Command::new("add").args(&[arg!([NAME] ...).id("install")]))
}

pub fn uninstall_command() -> clap::Command {
    clap::Command::new("package").subcommand(
        clap::Command::new("uninstall").args(&[arg!([NAME] ...).id("uninstall").short('y')]),
    )
    //.subcommand(clap::Command::new("remove").args(&[arg!([NAME] ...).id("uninstall")]))
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
        uninstall_command,
        install_command,
        name: String::from("default_command_only"),
        packages: vec!["cargo", "brew", "snap"]
            .iter()
            .map(|a| a.to_string())
            .collect(),
        ..default_package_manager()
    }
}
