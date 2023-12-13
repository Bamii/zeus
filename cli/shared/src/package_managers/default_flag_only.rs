use crate::models::package_manager::PackageManager;
use crate::package_managers::default::default as default_package_manager;
use clap::arg;

pub fn install_command() -> clap::Command {
    clap::Command::new("package").arg(
        arg!(-i --install <PACKAGE> ... "install a package")
            .num_args(1..)
            .id("install")
            .action(clap::ArgAction::Append),
    )
}

pub fn uninstall_command() -> clap::Command {
    clap::Command::new("package").arg(
        arg!(-u --uninstall <PACKAGE> ... "install a package")
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
        uninstall_command,
        install_command,
        name: String::from("default_flag_only"),
        packages: vec!["rpm"].iter().map(|a| a.to_string()).collect(),
        ..default_package_manager()
    }
}
