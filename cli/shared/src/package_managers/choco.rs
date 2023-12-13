use crate::models::package_manager::{PackageManager, PackageMeta};
use crate::package_managers::default::default as default_package_manager;
use clap::{arg, ArgAction};

fn install(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("{:?}", arr);
    Some((String::from(""), vec![]))
}

fn uninstall(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("{:?}", arr);
    Some((String::from(""), vec![]))
}

pub fn install_command() -> clap::Command {
    clap::Command::new("package").subcommand(
        clap::Command::new("install").args(&[arg!([NAME] ...)
            .id("install")
            .short('y')
            .action(ArgAction::Set)
            .num_args(1..)
            .allow_hyphen_values(true)]),
    )
}

// should probably actually use clap for this
pub fn parse_command(matches: &Vec<String>) -> Vec<String> {
    let me: Vec<String> = (&matches[..]).to_vec();

    let mut result: Vec<Vec<&str>> = vec![];
    let mut refree = me.iter().peekable();
    let mut values = me.iter().peekable();

    let mut intermidiary: Vec<_> = vec![];

    let mut in_works = "yes";
    for group in values {
        refree.next();

        let next = match refree.peek() {
            Some(result) => result,
            None => "",
        };

        match group.as_str() {
            "--version" | "-v" => {
                &intermidiary.push(group.as_str());
                &intermidiary.push(next);
                in_works = "vers";
            }
            _ => match next {
                "--version" | "-v" => {
                    &intermidiary.push(group.as_str());
                    in_works = "yes";
                }
                _ => {
                    match in_works {
                        "vers" => {
                            result.push(intermidiary.clone());
                            intermidiary = vec![];
                        }
                        "yes" => {
                            result.push(vec![group]);
                        }
                        _ => {}
                    }
                    in_works = "yes";
                }
            },
        }
    }

    result
        .iter()
        .map(|a| a.join(" "))
        .collect::<Vec<String>>()
        .to_vec()
}

pub fn uninstall_command() -> clap::Command {
    clap::Command::new("package")
        .subcommand(clap::Command::new("uninstall").args(&[arg!([NAME] ...).id("uninstall")]))
}

fn get_package_and_version(package: &str) -> PackageMeta {
    match package.split(" --version ").collect::<Vec<_>>()[..] {
        [program, version] => PackageMeta {
            name: program.to_string(),
            version: version.to_string(),
        },
        [program] => PackageMeta {
            name: program.to_string(),
            version: "latest".to_string(),
        },
        _ => {
            panic!("should really not happen");
        }
    }
}

pub fn default() -> PackageManager {
    PackageManager {
        name: String::from("choco"),
        install_command,
        uninstall_command,
        get_package_and_version,
        parse_command,
        packages: vec![],
        ..default_package_manager()
    }
}
